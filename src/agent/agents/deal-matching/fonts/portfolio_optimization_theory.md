# Mathematical Optimization of Corporate Acquisition Portfolios

When a corporate acquirer plans to buy multiple targets, allocating capital efficiently under constraints is a major challenge. This document presents a Mixed-Integer Linear Programming (MILP) model designed to optimize target selection, maximize portfolio return, and manage integration risk.

---

## 1. Mathematical Formulation

Let $I = \{1, 2, \dots, n\}$ be the set of potential target companies available for acquisition.

### Decision Variables
*   $x_i \in \{0, 1\}$: Binary decision variable where $x_i = 1$ if target $i$ is acquired, and $x_i = 0$ otherwise.
*   $z_{ij} \in \{0, 1\}$: Auxiliary binary variable representing the joint acquisition of targets $i$ and $j$, enabling the capture of pairwise synergy benefits.

### Parameters
*   $v_i$: Standalone net present value (NPV) or strategic score of target $i$.
*   $s_{ij}$: Additional synergy value realized only if both target $i$ and target $j$ are acquired.
*   $c_i$: Acquisition cost of target $i$ (purchase price including premium and transaction costs).
*   $B$: Total capital budget allocated for the acquisition campaign.
*   $S_k \subset I$: Subset of targets belonging to sector $k$.
*   $D_k$: Maximum allowed acquisitions in sector $k$ to ensure diversification.
*   $r_i$: Integration risk index of target $i$ (e.g., score from 1 to 10).
*   $R_{max}$: Maximum aggregate risk the organization can assume.

---

## 2. The MILP Model

$$\text{Maximize } \quad Z = \sum_{i \in I} v_i x_i + \sum_{i \in I} \sum_{\substack{j \in I \\ j > i}} s_{ij} z_{ij}$$

Subject to:

### I. Capital Budget Constraint
The total cost of acquired targets cannot exceed the available budget:
$$\sum_{i \in I} c_i x_i \leq B$$

### II. Synergy Logical Constraints
The synergy indicator $z_{ij}$ can only equal $1$ if both targets $i$ and $j$ are acquired:
$$z_{ij} \leq x_i \quad \forall i, j \in I, j > i$$
$$z_{ij} \leq x_j \quad \forall i, j \in I, j > i$$
$$z_{ij} \geq x_i + x_j - 1 \quad \forall i, j \in I, j > i$$

### III. Sector Diversification Constraints
Limit concentration in any single sector $k$ to mitigate market risk:
$$\sum_{i \in S_k} x_i \leq D_k \quad \forall k$$

### IV. Integration Risk Constraint
Prevent overloading the operational team:
$$\sum_{i \in I} r_i x_i \leq R_{max}$$

### V. Mutually Exclusive Targets (Logical Dependency)
If Target $A$ and Target $B$ are direct competitors or redundant:
$$x_A + x_B \leq 1$$

---

## 3. Implementation and Solver Notes

```mermaid
graph LR
    A[Target Pool & Constraints] --> B[GLPK / Gurobi Solver]
    B --> C[Optimal Portfolio Selection]
    C --> D[Resource & Budget Allocation]
```

*   **Solver Efficiency:** This MILP model is linear and can be solved using branch-and-bound algorithms in solvers like Gurobi, CPLEX, or open-source alternatives like GLPK/CBC.
*   **Sensitivity Analysis:** By varying the budget ($B$) and risk tolerance ($R_{max}$), decision-makers can map an **Efficient M&A Frontier**, showing the optimal portfolio value for different levels of capital expenditure.

> [!WARNING]
> While maximizing synergies ($s_{ij}$) is a key driver, if integration risks ($r_i$) are underestimated, the model will bias towards complex, multi-target combinations that may fail during post-merger integration.
