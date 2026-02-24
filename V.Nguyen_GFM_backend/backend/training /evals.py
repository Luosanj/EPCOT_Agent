"""
Evaluation metrics for genomic Q&A fine-tuning.
"""

from typing import List, Dict, Any
import json


def calculate_accuracy(predictions: List[str], references: List[str]) -> float:
    """
    Calculate exact match accuracy.
    
    Args:
        predictions: List of predicted responses
        references: List of reference responses
        
    Returns:
        Accuracy score (0-1)
    """
    if len(predictions) != len(references):
        raise ValueError("Predictions and references must have same length")
    
    matches = sum(1 for p, r in zip(predictions, references) if p.strip() == r.strip())
    return matches / len(predictions) if len(predictions) > 0 else 0.0


def evaluate_backend_knowledge_only(
    predictions: List[str],
    references: List[str],
    keywords_to_avoid: List[str] = None
) -> Dict[str, float]:
    """
    Evaluate if predictions avoid external knowledge and only reference backend capabilities.
    
    Args:
        predictions: List of predicted responses
        references: List of reference responses
        keywords_to_avoid: Keywords that indicate external knowledge (e.g., "UCSC", "Ensembl")
        
    Returns:
        Dictionary with evaluation metrics
    """
    if keywords_to_avoid is None:
        keywords_to_avoid = ["UCSC", "Ensembl", "NCBI", "PubMed", "external database"]
    
    results = {
        "total_examples": len(predictions),
        "avoided_external_refs": 0,
        "backend_only_score": 0.0,
    }
    
    for pred in predictions:
        pred_lower = pred.lower()
        avoided = all(keyword.lower() not in pred_lower for keyword in keywords_to_avoid)
        if avoided:
            results["avoided_external_refs"] += 1
    
    results["backend_only_score"] = (
        results["avoided_external_refs"] / results["total_examples"]
        if results["total_examples"] > 0 else 0.0
    )
    
    return results


def evaluate_training_data(training_file: str) -> Dict[str, Any]:
    """
    Evaluate training data quality.
    
    Args:
        training_file: Path to training JSONL file
        
    Returns:
        Evaluation metrics
    """
    examples = []
    with open(training_file, 'r') as f:
        for line in f:
            line = line.strip()
            if line:
                examples.append(json.loads(line))
    
    metrics = {
        "total_examples": len(examples),
        "valid_examples": 0,
        "avg_messages_per_example": 0.0,
        "has_system_prompt": 0,
    }
    
    total_messages = 0
    for example in examples:
        if "messages" in example and isinstance(example["messages"], list):
            metrics["valid_examples"] += 1
            messages = example["messages"]
            total_messages += len(messages)
            
            # Check for system prompt
            if any(msg.get("role") == "system" for msg in messages):
                metrics["has_system_prompt"] += 1
    
    if metrics["valid_examples"] > 0:
        metrics["avg_messages_per_example"] = total_messages / metrics["valid_examples"]
    
    return metrics


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        training_file = sys.argv[1]
        metrics = evaluate_training_data(training_file)
        print(json.dumps(metrics, indent=2))
    else:
        print("Usage: python evaluation.py <training_file>")
