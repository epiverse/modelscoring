# modelscoring
Task specific applicability scoring for embedding models

# Data format
The uploaded data must be a JSON file with the following format:
{
  "models": ["ModelA", "ModelB", "ModelC"],
  "queries": [
    {
      "id": "q1",
      "candidates": [
        { "id": "c1", "rel": 1, "sim": [0.91, 0.75, 0.82] },
        { "id": "c2", "rel": 0, "sim": [0.43, 0.61, 0.50] }
      ]
    }
  ]
}
