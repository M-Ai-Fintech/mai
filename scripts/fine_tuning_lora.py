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

    # 1. Configuração de Quantização para economia de VRAM (Google Colab / Free Tier)
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_use_double_quant=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16
    )

    # 2. Carregar Tokenizer e Modelo
    print(f"Loading tokenizer and model {model_id}...")
    tokenizer = AutoTokenizer.from_pretrained(model_id)
    tokenizer.pad_token = tokenizer.eos_token

    model = AutoModelForCausalLM.from_pretrained(
        model_id,
        quantization_config=bnb_config,
        device_map="auto"
    )
    
    # Prepara o modelo para treinamento em 4-bit (Gradient Checkpointing)
    model = prepare_model_for_kbit_training(model)

    # 3. Configuração do LoRA
    peft_config = LoraConfig(
        task_type=TaskType.CAUSAL_LM,
        r=16,
        lora_alpha=32,
        lora_dropout=0.05,
        target_modules=["q_proj", "v_proj", "k_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
        bias="none"
    )
    model = get_peft_model(model, peft_config)
    model.print_trainable_parameters()

    # 4. Carregar Dataset JSONL
    print(f"Loading dataset from {dataset_path}...")
    dataset = load_dataset("json", data_files=dataset_path, split="train")

    def format_instruction(example):
        text = f"### Instrução:\n{example['instruction']}\n\n### Contexto:\n{example['context']}\n\n### Resposta:\n{example['output']}"
        return {"text": text}

    dataset = dataset.map(format_instruction)

    # 5. Configurar Argumentos de Treinamento
    training_args = TrainingArguments(
        output_dir=output_dir,
        per_device_train_batch_size=4,
        gradient_accumulation_steps=4,
        optim="paged_adamw_32bit",
        save_steps=50,
        logging_steps=10,
        learning_rate=2e-4,
        weight_decay=0.001,
        fp16=False,
        bf16=True, # Llama-3 funciona melhor em bf16, mas necessita de Ampere (e.g. A100)
        max_grad_norm=0.3,
        max_steps=100,
        warmup_ratio=0.03,
        group_by_length=True,
        lr_scheduler_type="constant"
    )

    # 6. Executar o SFTTrainer
    print("Starting SFT Trainer...")
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

    # 7. Salvar o adapter LoRA resultante
    print(f"Saving LoRA adapter to {output_dir}...")
    trainer.model.save_pretrained(output_dir)
    tokenizer.save_pretrained(output_dir)
    print("Training finished successfully.")

if __name__ == "__main__":
    train_lora()
