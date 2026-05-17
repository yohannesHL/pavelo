"""
CLIP ViT-L/14 Model Loader (S3-01)

Loads the CLIP ViT-L/14 model with support for quantised weights and batch inference.
Provides image preprocessing, embedding generation, and zero-shot classification.

Usage:
    loader = CLIPModelLoader()
    await loader.load()
    embeddings = await loader.embed_images([img1, img2])
    scores = await loader.zero_shot_classify(image, ["exterior", "interior"])
"""

from __future__ import annotations

import io
from typing import Any

import structlog
from PIL import Image

from src.config import settings

logger = structlog.get_logger()

# Lazy imports — only loaded when model is actually used
_model = None
_preprocess = None
_tokenizer = None


class CLIPModelLoader:
    """Manages CLIP ViT-L/14 model lifecycle and inference."""

    def __init__(self) -> None:
        self._model = None
        self._preprocess = None
        self._tokenizer = None
        self._device: str = settings.clip_device
        self._loaded: bool = False

    async def load(self) -> None:
        """Load the CLIP model, preprocessor, and tokenizer.

        Uses open_clip for access to ViT-L/14 with OpenAI pretrained weights.
        Supports CPU and CUDA. On CPU, applies torch.float32 (quantisation
        can be added via torch.quantization for int8 inference).
        """
        if self._loaded:
            return

        try:
            import open_clip
            import torch

            logger.info(
                "clip_model_loading",
                model=settings.clip_model_name,
                pretrained=settings.clip_pretrained,
                device=self._device,
            )

            model, _, preprocess = open_clip.create_model_and_transforms(
                settings.clip_model_name,
                pretrained=settings.clip_pretrained,
                device=self._device,
            )
            tokenizer = open_clip.get_tokenizer(settings.clip_model_name)

            # Apply dynamic quantisation on CPU for reduced memory
            if self._device == "cpu":
                model = torch.quantization.quantize_dynamic(
                    model,
                    {torch.nn.Linear},
                    dtype=torch.qint8,
                )
                logger.info("clip_model_quantised", dtype="qint8")

            model.eval()
            self._model = model
            self._preprocess = preprocess
            self._tokenizer = tokenizer
            self._loaded = True

            logger.info("clip_model_loaded", device=self._device)

        except ImportError:
            logger.warning(
                "clip_model_unavailable",
                hint="Install open_clip_torch and torch to enable CLIP features",
            )
            raise
        except Exception as e:
            logger.error("clip_model_load_error", error=str(e))
            raise

    def preprocess_image(self, image: Image.Image) -> Any:
        """Preprocess a PIL Image for CLIP inference.

        Applies standard CLIP preprocessing:
        - Resize to 224x224
        - Center crop
        - Normalize with CLIP mean/std
        - Convert to tensor

        Args:
            image: PIL Image to preprocess.

        Returns:
            Preprocessed tensor ready for model input.
        """
        if not self._loaded:
            raise RuntimeError("Model not loaded. Call load() first.")

        # Ensure RGB
        if image.mode != "RGB":
            image = image.convert("RGB")

        return self._preprocess(image)

    def preprocess_image_from_bytes(self, image_bytes: bytes) -> Any:
        """Preprocess an image from raw bytes.

        Args:
            image_bytes: Raw image bytes (JPEG, PNG, WebP).

        Returns:
            Preprocessed tensor.
        """
        image = Image.open(io.BytesIO(image_bytes))
        return self.preprocess_image(image)

    async def embed_images(self, images: list[Image.Image]) -> list[list[float]]:
        """Generate CLIP embeddings for a batch of images.

        Args:
            images: List of PIL Images.

        Returns:
            List of embedding vectors (768 dimensions each).
        """
        if not self._loaded:
            raise RuntimeError("Model not loaded. Call load() first.")

        import torch

        tensors = [self.preprocess_image(img) for img in images]
        batch = torch.stack(tensors).to(self._device)

        with torch.no_grad():
            features = self._model.encode_image(batch)
            features = features / features.norm(dim=-1, keepdim=True)

        embeddings = features.cpu().numpy().tolist()

        logger.info("clip_images_embedded", count=len(images), dim=len(embeddings[0]))
        return embeddings

    async def embed_texts(self, texts: list[str]) -> list[list[float]]:
        """Generate CLIP text embeddings for a list of prompts.

        Args:
            texts: List of text strings.

        Returns:
            List of embedding vectors (768 dimensions each).
        """
        if not self._loaded:
            raise RuntimeError("Model not loaded. Call load() first.")

        import torch

        tokens = self._tokenizer(texts).to(self._device)

        with torch.no_grad():
            features = self._model.encode_text(tokens)
            features = features / features.norm(dim=-1, keepdim=True)

        return features.cpu().numpy().tolist()

    async def zero_shot_classify(
        self,
        image: Image.Image,
        labels: list[str],
        prompt_template: str = "a photo of {}",
    ) -> list[dict[str, Any]]:
        """Zero-shot classification using CLIP.

        Computes similarity between image embedding and text embeddings
        for each label, returning ranked results with confidence scores.

        Args:
            image: PIL Image to classify.
            labels: List of class label strings.
            prompt_template: Template with {} placeholder for label.

        Returns:
            Sorted list of {label, confidence} dicts, highest first.
        """
        if not self._loaded:
            raise RuntimeError("Model not loaded. Call load() first.")

        import torch

        # Encode image
        img_tensor = self.preprocess_image(image).unsqueeze(0).to(self._device)
        prompts = [prompt_template.format(label) for label in labels]
        text_tokens = self._tokenizer(prompts).to(self._device)

        with torch.no_grad():
            img_features = self._model.encode_image(img_tensor)
            text_features = self._model.encode_text(text_tokens)

            img_features = img_features / img_features.norm(dim=-1, keepdim=True)
            text_features = text_features / text_features.norm(dim=-1, keepdim=True)

            # Cosine similarity → softmax for probabilities
            similarities = (img_features @ text_features.T).squeeze(0)
            probs = torch.softmax(similarities * 100.0, dim=-1)

        results = []
        for label, prob in zip(labels, probs.cpu().numpy()):
            results.append({"label": label, "confidence": round(float(prob), 4)})

        results.sort(key=lambda x: x["confidence"], reverse=True)

        logger.info(
            "zero_shot_classify",
            top_label=results[0]["label"],
            top_confidence=results[0]["confidence"],
            n_labels=len(labels),
        )

        return results

    @property
    def is_loaded(self) -> bool:
        return self._loaded


# Singleton instance
clip_loader = CLIPModelLoader()
