// src/agent/fine_tuning.ts

/**
 * References and documentation for the post-investment fine-tuning phase.
 * Under this model, the startup will train custom LoRA (Low-Rank Adaptation) weights
 * to run localized M&A due diligence checks.
 */
export class FineTuningRegistry {
  /**
   * Returns the schema for the training dataset (JSONL format).
   */
  public static getDatasetSchema(): Record<string, any> {
    return {
      format: "JSONL",
      requiredFields: ["instruction", "context", "output"],
      example: {
        instruction: "Identifique as implicações de Change of Control.",
        context: "No caso de alienação de controle...",
        output: "A implicação é a possibilidade de rescisão unilateral..."
      },
      targetDomain: "M&A Brazilian Market (Juridiquês / Financês)",
    };
  }

  /**
   * Returns details about the planned training configuration.
   */
  public static getLoraTrainingConfig(): Record<string, any> {
    return {
      baseModel: "meta-llama/Llama-3-8B-Instruct",
      adapterType: "LoRA",
      quantization: "4-bit (bitsandbytes nf4)",
      hyperparameters: {
        r: 16,
        alpha: 32,
        dropout: 0.05,
        targetModules: ["q_proj", "v_proj", "k_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
        learningRate: 2e-4,
        epochs: 3,
        batchSize: 4,
        gradientAccumulationSteps: 4,
      },
      datasetSizeRequired: "minimum 500 validated Virtual Data Room audits",
      frameworkTarget: "Hugging Face PEFT / trl (SFTTrainer) / PyTorch",
    };
  }

  /**
   * Generates a sample Python code snippet for starting a LoRA training run.
   */
  public static getLoraTrainingScript(): string {
    return `
import os
import torch
from datasets import load_dataset
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    TrainingArguments
)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training, TaskType
from trl import SFTTrainer

def train_lora():
    model_id = "meta-llama/Meta-Llama-3-8B-Instruct"
    dataset_path = "dataset_ma_br_mock.jsonl"
    output_dir = "./lora_adapter_ma_br"

    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_use_double_quant=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16
    )

    tokenizer = AutoTokenizer.from_pretrained(model_id)
    tokenizer.pad_token = tokenizer.eos_token

    model = AutoModelForCausalLM.from_pretrained(
        model_id,
        quantization_config=bnb_config,
        device_map="auto"
    )
    model = prepare_model_for_kbit_training(model)

    peft_config = LoraConfig(
        task_type=TaskType.CAUSAL_LM,
        r=16,
        lora_alpha=32,
        lora_dropout=0.05,
        target_modules=["q_proj", "v_proj", "k_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
        bias="none"
    )
    model = get_peft_model(model, peft_config)

    dataset = load_dataset("json", data_files=dataset_path, split="train")

    def format_instruction(example):
        return {"text": f"### Instrução:\\n{example['instruction']}\\n\\n### Contexto:\\n{example['context']}\\n\\n### Resposta:\\n{example['output']}"}

    dataset = dataset.map(format_instruction)

    training_args = TrainingArguments(
        output_dir=output_dir,
        per_device_train_batch_size=4,
        gradient_accumulation_steps=4,
        optim="paged_adamw_32bit",
        save_steps=50,
        logging_steps=10,
        learning_rate=2e-4,
        fp16=False,
        bf16=True,
        max_steps=100,
    )

    trainer = SFTTrainer(
        model=model,
        train_dataset=dataset,
        peft_config=peft_config,
        dataset_text_field="text",
        max_seq_length=1024,
        tokenizer=tokenizer,
        args=training_args
    )

    trainer.train()
    trainer.model.save_pretrained(output_dir)
    tokenizer.save_pretrained(output_dir)

if __name__ == "__main__":
    train_lora()
`;
  }
}
