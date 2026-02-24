"""
Configuration for fine-tuning genomic LLM models.
"""

from dataclasses import dataclass
from typing import Optional, Dict, Any


@dataclass
class FineTuneConfig:
    """Configuration for fine-tuning."""
    
    # Model settings
    base_model: str = "qwen3"
    model_name: str = "gfm-assistant"
    
    # Training parameters
    learning_rate: float = 2e-5
    batch_size: int = 4
    num_epochs: int = 3
    warmup_steps: int = 100
    
    # Data settings
    train_split: float = 0.9
    validation_split: float = 0.1
    max_seq_length: int = 2048
    
    # Output settings
    output_dir: str = "./fine_tuned_models"
    save_steps: int = 500
    eval_steps: int = 500
    logging_steps: int = 100
    
    # Advanced settings
    gradient_accumulation_steps: int = 1
    fp16: bool = True
    dataloader_num_workers: int = 4
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert config to dictionary."""
        return {
            "base_model": self.base_model,
            "model_name": self.model_name,
            "learning_rate": self.learning_rate,
            "batch_size": self.batch_size,
            "num_epochs": self.num_epochs,
            "warmup_steps": self.warmup_steps,
            "train_split": self.train_split,
            "validation_split": self.validation_split,
            "max_seq_length": self.max_seq_length,
            "output_dir": self.output_dir,
            "save_steps": self.save_steps,
            "eval_steps": self.eval_steps,
            "logging_steps": self.logging_steps,
            "gradient_accumulation_steps": self.gradient_accumulation_steps,
            "fp16": self.fp16,
            "dataloader_num_workers": self.dataloader_num_workers,
        }
    
    @classmethod
    def from_dict(cls, config_dict: Dict[str, Any]) -> "FineTuneConfig":
        """Create config from dictionary."""
        return cls(**config_dict)
    
    def save(self, file_path: str):
        """Save config to JSON file."""
        import json
        with open(file_path, 'w') as f:
            json.dump(self.to_dict(), f, indent=2)
    
    @classmethod
    def load(cls, file_path: str) -> "FineTuneConfig":
        """Load config from JSON file."""
        import json
        with open(file_path, 'r') as f:
            return cls.from_dict(json.load(f))


# Default configuration
DEFAULT_CONFIG = FineTuneConfig()
