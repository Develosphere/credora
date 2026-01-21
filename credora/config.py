"""Configuration for Credora CFO Agent system.

Handles LLM provider setup with OpenRouter via OpenAI-compatible interface.
"""

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Optional


@dataclass
class ModelConfig:
    """Configuration for LLM model."""
    
    model_name: str = "google/gemma-3-27b-it:free"  # More reliable free model
    base_url: str = "https://openrouter.ai/api/v1"
    temperature: float = 0.7
    max_tokens: int = 4096


# Shared encryption key file for token storage
ENCRYPTION_KEY_FILE = ".credora_key"


def get_or_create_encryption_key() -> bytes:
    """Get or create a shared encryption key for token storage.
    
    This ensures both the OAuth server and CLI use the same key
    to encrypt/decrypt tokens.
    
    Returns:
        The encryption key bytes.
    """
    from credora.security import TokenEncryption
    
    key_path = Path(ENCRYPTION_KEY_FILE)
    
    if key_path.exists():
        # Load existing key
        with open(key_path, 'rb') as f:
            return f.read()
    else:
        # Generate and save new key
        key = TokenEncryption.generate_key()
        with open(key_path, 'wb') as f:
            f.write(key)
        return key


# API key rotation state
_current_key_index = 0


def get_api_key() -> str:
    """Get the OpenRouter API key from environment with rotation support.
    
    Supports multiple API keys via OPENROUTER_API_KEY and OPENROUTER_API_KEY_2.
    Call rotate_api_key() to switch to the next key when rate limited.
    
    Returns:
        The API key string.
        
    Raises:
        ValueError: If no API keys are configured.
    """
    global _current_key_index
    
    # Get all available keys
    keys = []
    key1 = os.environ.get("OPENROUTER_API_KEY", "")
    key2 = os.environ.get("OPENROUTER_API_KEY_2", "")
    
    if key1:
        keys.append(key1)
    if key2:
        keys.append(key2)
    
    if not keys:
        raise ValueError(
            "OPENROUTER_API_KEY environment variable is not set. "
            "Please set it in your .env file or environment."
        )
    
    # Return current key (with bounds check)
    return keys[_current_key_index % len(keys)]


def rotate_api_key() -> str:
    """Rotate to the next API key.
    
    Call this when you hit a rate limit to switch to another key.
    
    Returns:
        The new API key after rotation.
    """
    global _current_key_index
    _current_key_index += 1
    return get_api_key()


def get_all_api_keys() -> list:
    """Get all configured API keys.
    
    Returns:
        List of all API keys.
    """
    keys = []
    key1 = os.environ.get("OPENROUTER_API_KEY", "")
    key2 = os.environ.get("OPENROUTER_API_KEY_2", "")
    
    if key1:
        keys.append(key1)
    if key2:
        keys.append(key2)
    
    return keys


def get_model_config(
    model_name: Optional[str] = None,
    temperature: Optional[float] = None,
    max_tokens: Optional[int] = None,
) -> ModelConfig:
    """Get model configuration with optional overrides.
    
    Args:
        model_name: Override default model name.
        temperature: Override default temperature.
        max_tokens: Override default max tokens.
        
    Returns:
        ModelConfig instance with specified or default values.
    """
    config = ModelConfig()
    if model_name is not None:
        config.model_name = model_name
    if temperature is not None:
        config.temperature = temperature
    if max_tokens is not None:
        config.max_tokens = max_tokens
    return config
