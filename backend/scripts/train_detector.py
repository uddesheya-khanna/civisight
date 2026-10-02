"""
Training wrapper for fine-tuning YOLO models on infrastructure datasets.
PRD Section 9.4
"""
import argparse
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description="CiviSight AI — Train Custom YOLO Detector")
    parser.add_argument("--task", choices=["detect", "segment"], default="detect", help="Task type")
    parser.add_argument("--data", required=True, help="Path to dataset data.yaml")
    parser.add_argument("--model", default="yolov8n.pt", help="Base model weights (e.g. yolov8n.pt, yolov8n-seg.pt)")
    parser.add_argument("--epochs", type=int, default=50, help="Number of training epochs")
    parser.add_argument("--batch", type=int, default=8, help="Batch size")
    parser.add_argument("--imgsz", type=int, default=640, help="Image size")
    parser.add_argument("--device", default="cpu", help="Device (cpu, cuda:0, etc.)")
    parser.add_argument("--output-weights", help="Destination to copy best.pt after training")

    args = parser.parse_args()

    from ultralytics import YOLO

    print(f"Starting CiviSight training: task={args.task}, model={args.model}, data={args.data}")
    model = YOLO(args.model)
    results = model.train(
        data=args.data,
        epochs=args.epochs,
        batch=args.batch,
        imgsz=args.imgsz,
        device=args.device,
    )

    print("Training complete!")
    if args.output_weights and hasattr(model.trainer, "best"):
        import shutil
        best_path = Path(model.trainer.best)
        if best_path.exists():
            dest = Path(args.output_weights)
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy(best_path, dest)
            print(f"Saved best weights to {dest}")


if __name__ == "__main__":
    main()
