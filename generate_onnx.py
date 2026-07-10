import os
import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np

os.makedirs('models', exist_ok=True)
device = torch.device("cpu")

def generate_dummy_financials(num_samples=1000):
    X = np.random.randn(num_samples, 6).astype(np.float32)
    y = []
    for sample in X:
        ebitda, revenue, assets, liabilities, cashflow, vol = sample
        assets = max(0.1, abs(assets))
        z_score = 1.2 * (revenue*0.1/assets) + 3.3 * (ebitda/assets) + 0.6 * (revenue/assets)
        insolvency_prob = 1.0 / (1.0 + np.exp(z_score - 1.5))
        churn_prob = min(0.98, max(0.02, abs(liabilities/assets)*0.4 + vol*0.5))
        dcf_vol = min(100.0, max(2.0, vol*30.0 + abs(liabilities/assets)*10.0))
        ind4_score = 100.0 - insolvency_prob*50.0 - churn_prob*30.0
        y.append([insolvency_prob, churn_prob, dcf_vol/100.0, ind4_score/100.0])
    return torch.tensor(X), torch.tensor(y, dtype=torch.float32)

X_train, y_train = generate_dummy_financials(2000)

class MACallClassifier(nn.Module):
    def __init__(self, input_dim=6, hidden_dim=16, output_dim=4):
        super(MACallClassifier, self).__init__()
        self.network = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, output_dim),
            nn.Sigmoid()
        )
    def forward(self, x):
        return self.network(x)

model = MACallClassifier().to(device)
criterion = nn.MSELoss()
optimizer = optim.Adam(model.parameters(), lr=0.005)

epochs = 100
batch_size = 32
model.train()

for epoch in range(epochs):
    permutation = torch.randperm(X_train.size()[0])
    for i in range(0, X_train.size()[0], batch_size):
        indices = permutation[i:i+batch_size]
        batch_x, batch_y = X_train[indices].to(device), y_train[indices].to(device)
        optimizer.zero_grad()
        outputs = model(batch_x)
        loss = criterion(outputs, batch_y)
        loss.backward()
        optimizer.step()

model.eval()
dummy_input = torch.randn(1, 6).to(device)

onnx_path = "models/ma_classifier.onnx"
torch.onnx.export(
    model,
    dummy_input,
    onnx_path,
    export_params=True,
    opset_version=17,
    do_constant_folding=True,
    input_names=['financials'],
    output_names=['predictions'],
    dynamic_axes={'financials': {0: 'batch_size'}, 'predictions': {0: 'batch_size'}}
)

from onnxruntime.quantization import quantize_dynamic, QuantType
quantized_path = "models/ma_classifier_q8.onnx"
quantize_dynamic(
    onnx_path,
    quantized_path,
    weight_type=QuantType.QUInt8
)
