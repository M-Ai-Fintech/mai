# Modelos Brasileiros de Previsão de Insolvência

## 1. Termômetro de Kanitz (1978)
Desenvolvido por Stephen Charles Kanitz, este modelo estatístico prediz o risco de falência a curto prazo de empresas brasileiras utilizando uma análise discriminante baseada em cinco índices financeiros.

### Fórmula (Fator de Insolvência - FI)
$$ FI = (0,05 \times RP) + (1,65 \times LG) + (3,55 \times LS) - (1,06 \times LC) - (0,33 \times GE) $$

**Variáveis:**
* **RP (Rentabilidade do Patrimônio):** Lucro Líquido / Patrimônio Líquido
* **LG (Liquidez Geral):** (Ativo Circulante + Realizável a Longo Prazo) / (Passivo Circulante + Exigível a Longo Prazo)
* **LS (Liquidez Seca):** (Ativo Circulante - Estoques) / Passivo Circulante
* **LC (Liquidez Corrente):** Ativo Circulante / Passivo Circulante
* **GE (Grau de Endividamento):** (Passivo Circulante + Exigível a Longo Prazo) / Patrimônio Líquido

### Cut-off Ranges (Red Flags)
* **FI > 0:** **Zona de Solvência** (Baixo risco financeiro, segurança).
* **FI entre 0 e -3:** **Zona de Penumbra** (Atenção, sinais de dificuldade).
* **FI < -3:** **Zona de Insolvência** (*Red flag* máximo, alta probabilidade e perigo iminente de falência).

## 2. Modelo de Elizabetsky (1976)
Criado para padronizar os processos de avaliação de risco e concessão de crédito no Brasil.

### Fórmula (Z-Score)
$$ Z = 1,93(X_1) - 0,20(X_2) + 1,02(X_3) + 1,33(X_4) - 1,12(X_5) $$

**Variáveis:**
* **$X_1$:** Lucro Líquido / Vendas
* **$X_2$:** Disponível / Ativo Permanente
* **$X_3$:** Contas a Receber / Ativo Total
* **$X_4$:** Estoques / Ativo Total
* **$X_5$:** Passivo Circulante / Ativo Total

### Cut-off Ranges (Red Flags)
* **Z > 0,5:** **Solvente** (Demonstra capacidade sólida de honrar compromissos e quitar dívidas).
* **Z < 0,5:** **Insolvente** (*Red flag*, empresa apresenta fortes indícios de incapacidade financeira).
