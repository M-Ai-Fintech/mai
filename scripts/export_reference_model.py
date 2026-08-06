#!/usr/bin/env python3
"""Export the deterministic, synthetic MAI-142 reference ONNX artifact.

The model is a local reference runtime fixture, not a statistically validated
financial model. The fixed seeds and full-batch optimizer make the generated
weights reproducible in the pinned Python environment documented in the
notebook.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import tempfile
from pathlib import Path

import numpy as np
import onnx
from onnx import TensorProto, helper, numpy_helper
from onnxruntime.quantization import QuantType, quantize_dynamic

DATASET_SEED = 142
MODEL_SEED = 1142
SAMPLE_COUNT = 2048
EPOCHS = 800
LEARNING_RATE = 0.12
MODEL_ID = "mai-financial-risk-reference"
MODEL_VERSION = "1.0.0"
TRAINING_CODE_VERSION = "reference-export-v1"
GENERATED_TIMESTAMP = "2026-08-01T00:00:00Z"
INPUT_FEATURES = (
    "ebitda",
    "revenue",
    "totalAssets",
    "totalLiabilities",
    "operatingCashFlow",
    "historicalVolatility",
)
OUTPUT_VALUES = (
    ("insolvencyRisk", 0, 1, "probability"),
    ("churnProbability", 1, 1, "probability"),
    ("dcfVolatility", 2, 100, "percent"),
    ("industry4Score", 3, 100, "score"),
)


def generate_synthetic_data() -> tuple[np.ndarray, np.ndarray]:
    """Generate deterministic six-feature samples and four synthetic targets."""

    rng = np.random.default_rng(DATASET_SEED)
    features = rng.normal(0, 1, size=(SAMPLE_COUNT, len(INPUT_FEATURES)))
    target_rng = np.random.default_rng(DATASET_SEED + 1)
    target_weights = target_rng.normal(0, 0.7, size=(len(INPUT_FEATURES), 4))
    target_bias = target_rng.normal(0, 0.2, size=4)
    logits = features @ target_weights + target_bias
    targets = 1 / (1 + np.exp(-logits))
    return features.astype(np.float32), targets.astype(np.float32)


def train_reference_weights(
    features: np.ndarray,
    targets: np.ndarray,
) -> tuple[np.ndarray, np.ndarray]:
    """Train a deterministic full-batch four-output sigmoid reference model."""

    rng = np.random.default_rng(MODEL_SEED)
    weights = rng.normal(0, 0.05, size=(features.shape[1], 4)).astype(np.float64)
    bias = np.zeros(4, dtype=np.float64)
    sample_count = float(features.shape[0])
    for _ in range(EPOCHS):
        logits = features @ weights + bias
        prediction = 1 / (1 + np.exp(-logits))
        gradient = (prediction - targets) * prediction * (1 - prediction)
        weights -= LEARNING_RATE * (features.T @ gradient) / sample_count
        bias -= LEARNING_RATE * gradient.sum(axis=0) / sample_count
    return weights.astype(np.float32), bias.astype(np.float32)


def make_raw_model(weights: np.ndarray, bias: np.ndarray) -> onnx.ModelProto:
    """Build a dynamic-batch ONNX graph with one four-value output tensor."""

    input_info = helper.make_tensor_value_info(
        "financials",
        TensorProto.FLOAT,
        ["batch_size", len(INPUT_FEATURES)],
    )
    output_info = helper.make_tensor_value_info(
        "predictions",
        TensorProto.FLOAT,
        ["batch_size", len(OUTPUT_VALUES)],
    )
    nodes = [
        helper.make_node(
            "MatMul",
            ["financials", "weights"],
            ["logits"],
            name="reference_matmul",
        ),
        helper.make_node(
            "Add",
            ["logits", "bias"],
            ["biased_logits"],
            name="reference_bias",
        ),
        helper.make_node(
            "Sigmoid",
            ["biased_logits"],
            ["predictions"],
            name="reference_sigmoid",
        ),
    ]
    graph = helper.make_graph(
        nodes,
        "reference_model_graph",
        [input_info],
        [output_info],
        initializer=[
            numpy_helper.from_array(weights, name="weights"),
            numpy_helper.from_array(bias, name="bias"),
        ],
    )
    model = helper.make_model(
        graph,
        producer_name="reference-export",
        producer_version=TRAINING_CODE_VERSION,
        opset_imports=[helper.make_opsetid("", 17)],
    )
    model.metadata_props.add(key="model_id", value=MODEL_ID)
    model.metadata_props.add(key="model_version", value=MODEL_VERSION)
    model.metadata_props.add(key="dataset_seed", value=str(DATASET_SEED))
    model.metadata_props.add(key="training_code_version", value=TRAINING_CODE_VERSION)
    onnx.checker.check_model(model)
    return model


def sha256(path: Path) -> str:
    """Return the SHA-256 checksum of a generated artifact."""

    return hashlib.sha256(path.read_bytes()).hexdigest()


def manifest_for(artifact_path: str, checksum: str) -> dict[str, object]:
    """Build the stable manifest consumed by the Deno runtime."""

    return {
        "schemaVersion": 1,
        "modelId": MODEL_ID,
        "modelVersion": MODEL_VERSION,
        "trainingCodeVersion": TRAINING_CODE_VERSION,
        "input": {
            "name": "financials",
            "dtype": "float32",
            "shape": ["batch_size", len(INPUT_FEATURES)],
            "features": list(INPUT_FEATURES),
        },
        "output": {
            "name": "predictions",
            "dtype": "float32",
            "shape": ["batch_size", len(OUTPUT_VALUES)],
            "values": [
                {
                    "name": name,
                    "index": index,
                    "scale": scale,
                    "unit": unit,
                }
                for name, index, scale, unit in OUTPUT_VALUES
            ],
        },
        "onnx": {
            "opset": 17,
            "quantization": "dynamic-weight-uint8",
        },
        "artifact": {
            "path": artifact_path,
            "sha256": checksum,
            "generatedTimestamp": GENERATED_TIMESTAMP,
            "readinessClassification": "reference-only",
        },
        "dataset": {
            "source": "synthetic; no production or research dataset was used",
            "generationMethod": (
                "NumPy default_rng normal samples with seed 142 and deterministic "
                "rule-derived sigmoid targets; full-batch gradient descent"
            ),
            "schema": list(INPUT_FEATURES),
            "limitations": [
                "Synthetic demonstration data is not representative of Brazilian M&A financials.",
                "No statistical usefulness, production certification, or regulatory suitability is claimed.",
                "The artifact is a local runtime and contract reference for MAI-142 only.",
            ],
        },
    }


def export_artifact(output_dir: Path) -> tuple[str, str]:
    """Export raw and q8 artifacts plus their stable manifest and sidecar."""

    output_dir.mkdir(parents=True, exist_ok=True)
    features, targets = generate_synthetic_data()
    weights, bias = train_reference_weights(features, targets)
    raw_path = output_dir / "ma_classifier.onnx"
    quantized_path = output_dir / "ma_classifier_q8.onnx"
    onnx.save(make_raw_model(weights, bias), raw_path)
    quantize_dynamic(
        str(raw_path),
        str(quantized_path),
        weight_type=QuantType.QUInt8,
    )
    onnx.checker.check_model(onnx.load(quantized_path))
    checksum = sha256(quantized_path)
    manifest = manifest_for("models/ma_classifier_q8.onnx", checksum)
    manifest_path = output_dir / "ma_classifier_q8.manifest.json"
    manifest_path.write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )
    (output_dir / "ma_classifier_q8.onnx.sha256").write_text(
        f"{checksum}  ma_classifier_q8.onnx\n",
        encoding="utf-8",
    )
    return checksum, str(manifest_path)


def assert_reproducible() -> None:
    """Export twice in clean temporary directories and compare checksums."""

    with tempfile.TemporaryDirectory(prefix="reference-export-") as first_dir:
        with tempfile.TemporaryDirectory(prefix="reference-export-") as second_dir:
            first_hash, _ = export_artifact(Path(first_dir))
            second_hash, _ = export_artifact(Path(second_dir))
    if first_hash != second_hash:
        raise RuntimeError(
            f"Reference export is not reproducible: {first_hash} != {second_hash}"
        )
    print(f"reproducible q8 checksum: {first_hash}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("models"),
        help="Directory receiving ma_classifier.onnx and the q8 manifest.",
    )
    parser.add_argument(
        "--check-reproducibility",
        action="store_true",
        help="Export twice in temporary directories and compare q8 checksums.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.check_reproducibility:
        assert_reproducible()
    checksum, manifest_path = export_artifact(args.output_dir)
    print(f"exported q8 artifact checksum: {checksum}")
    print(f"manifest: {manifest_path}")


if __name__ == "__main__":
    main()
