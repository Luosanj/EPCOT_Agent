import json
import os
from typing import List, Dict, Any, Optional
from pathlib import Path


def load_chat_logs(log_file_path: str) -> List[Dict[str, Any]]:
    """
    Load chat logs from a JSON file.
    
    Args:
        log_file_path: Path to chat log file
        
    Returns:
        List of chat conversations
    """
    with open(log_file_path, 'r') as f:
        return json.load(f)


def format_for_fine_tuning(
    conversations: List[Dict[str, Any]],
    system_prompt: str
) -> List[Dict[str, Any]]:
    """
    Format conversations for fine-tuning format.
    
    Args:
        conversations: List of conversation dictionaries
        system_prompt: System prompt to prepend
        
    Returns:
        List of formatted training examples
    """
    training_examples = []
    
    for conv in conversations:
        messages = [{"role": "system", "content": system_prompt}]
        
        # Add conversation messages
        for msg in conv.get("messages", []):
            role = msg.get("role")
            content = msg.get("content")
            
            if role and content:
                messages.append({"role": role, "content": content})
        
        if len(messages) > 1:  # At least system + one user message
            training_examples.append({"messages": messages})
    
    return training_examples


def save_training_data(
    training_examples: List[Dict[str, Any]],
    output_path: str,
    format: str = "jsonl"
):
    """
    Save training data to file.
    
    Args:
        training_examples: List of training examples
        output_path: Output file path
        format: Output format ('jsonl' or 'json')
    """
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    if format == "jsonl":
        with open(output_path, 'w') as f:
            for example in training_examples:
                f.write(json.dumps(example) + '\n')
    elif format == "json":
        with open(output_path, 'w') as f:
            json.dump(training_examples, f, indent=2)
    else:
        raise ValueError(f"Unsupported format: {format}")


def prepare_from_existing_training_file(
    input_file: str,
    output_file: Optional[str] = None
) -> str:
    """
    Prepare training data from existing training_data.jsonl file.
    Validates and optionally reformats the file.
    
    Args:
        input_file: Path to input training file
        output_file: Optional output file path (if None, uses input_file)
        
    Returns:
        Path to output file
    """
    if output_file is None:
        output_file = input_file
    
    # Validate JSONL file
    valid_examples = []
    with open(input_file, 'r') as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            
            try:
                example = json.loads(line)
                if "messages" in example and isinstance(example["messages"], list):
                    valid_examples.append(example)
                else:
                    print(f"Warning: Line {line_num} missing 'messages' field")
            except json.JSONDecodeError as e:
                print(f"Error: Line {line_num} invalid JSON: {e}")
    
    # Write validated examples
    with open(output_file, 'w') as f:
        for example in valid_examples:
            f.write(json.dumps(example) + '\n')
    
    print(f"Prepared {len(valid_examples)} valid training examples")
    return output_file


if __name__ == "__main__":
    # Example usage
    import sys
    
    if len(sys.argv) > 1:
        input_file = sys.argv[1]
        output_file = sys.argv[2] if len(sys.argv) > 2 else None
        prepare_from_existing_training_file(input_file, output_file)
    else:
        print("Usage: python data_preparation.py <input_file> [output_file]")
