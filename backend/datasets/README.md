# CiviSight AI — Dataset Guidelines

This directory contains datasets used for training and evaluating computer vision models in CiviSight AI.

## Expected Dataset Layout (YOLO Format)

```
datasets/<dataset_name>/
  images/
    train/
    val/
    test/
  labels/
    train/
    val/
    test/
  data.yaml
```

### data.yaml Format Example:
```yaml
path: datasets/crack
train: images/train
val: images/val
test: images/test

names:
  0: crack
```

For segmentation datasets, label files contain normalized polygon coordinates `class x1 y1 x2 y2 ... xn yn`.
For bounding box detection, label files contain normalized bounding boxes `class cx cy w h`.

## Candidate Public Datasets (PRD Section 9.4)

| Module | Dataset | Link/Source |
|---|---|---|
| Crack | DeepCrack / CRACK500 / Roboflow Crack Segmentation | Public academic / research datasets |
| Pothole | RDD2022 (Road Damage Dataset - D40 class) / Roboflow Pothole | IEEE BigData Cup / Open datasets |
| Safety & PPE | SH17 PPE / Hard Hat Detection | Kaggle / Roboflow |
