# Valuation

Company valuation (or business valuation) is the process of assessing the total
economic value of a business and its assets. While a simple subtraction of
liabilities from assets provides a baseline, finance professionals use more
sophisticated methods to determine a company's fair market value.

These valuation methods interconnect by building on top of each other—moving
from simple balance sheet figures and equity-only measures to comprehensive
enterprise value calculations, operating earnings (EBITDA), and fundamental
growth models like the growing perpetuity formula.

## Methods

### 1. Book Value

**Book value** is one of the most straightforward methods of valuing a company,
calculated using balance sheet information.

- **Calculation:** Subtract a company's liabilities from its assets to determine
  owners' equity, and then exclude any intangible assets (leaving only tangible
  assets).
- **Limitations:** It is notably unreliable. As HBS Professor Mihir Desai notes,
  balance sheet figures do not equate to actual market value due to historical
  cost accounting and the principle of conservatism.

### 2. Discounted Cash Flow (DCF)

Highlighted as the **"gold standard of valuation"**, DCF estimates the value of
an investment or company based on the future cash flows it is expected to
generate, adjusted for the time value of money.

- **Formula:**
  $$\text{Discounted Cash Flow} = \frac{\text{Terminal Cash Flow}}{(1 + \text{Cost of Capital})^{t}}$$
  _(where $t$ is the number of years in the future)_
- **Key Benefit:** Reflects a company's actual ability to generate liquid
  assets.
- **Key Challenge:** Accuracy depends heavily on the terminal value and
  assumptions made about future growth rates and discount rates.

### 3. Market Capitalization

**Market capitalization** is the simplest measure of a publicly traded company's
value, representing its equity value in the public market.

- **Formula:**
  $$\text{Market Capitalization} = \text{Share Price} \times \text{Total Number of Shares}$$
- **Limitation:** It only accounts for the value of **equity**. Most companies
  are financed by a combination of both **debt** (investments by
  banks/bondholders repaid with interest) and **equity** (shareholders claiming
  future profits). To account for different capital structures, analysts use
  Enterprise Value.

### 4. Enterprise Value (EV)

**Enterprise Value** provides a more accurate measure of a company's total value
by considering its entire capital structure (both debt and equity) and
subtracting cash that is not used to fund active business operations.

- **Formula:**
  $$\text{Enterprise Value} = \text{Debt} + \text{Equity} - \text{Cash}$$
- **Comparison Example (HBS Article Data):** Capital structures vary widely,
  which is why EV is more representative than Market Cap alone:
  - **Tesla:** Market Cap: \$50.5B | Liabilities: \$17.5B | Cash: \$3.5B
    $\rightarrow$ **EV: ~\$64.5B** _(74% financed with equity)_
  - **Ford:** Market Cap: \$44.8B | Liabilities: \$208.7B | Cash: \$15.9B
    $\rightarrow$ **EV: ~\$237.6B** _(18% financed with equity)_
  - **General Motors (GM):** Market Cap: \$51.0B | Liabilities: \$177.8B | Cash:
    \$13.0B $\rightarrow$ **EV: ~\$215.8B** _(22.3% financed with equity)_

## 5. EBITDA

**EBITDA** (Earnings Before Interest, Taxes, Depreciation, and Amortization) is
a proxy for operating cash flow. It strips out distortions caused by tax
jurisdictions, interest payments (capital structure differences), and non-cash
accounting conventions like depreciation and amortization.

- **Accounting Distortions Removed:**
  - **Taxes:** Vary by country and time, distracting from operational
    performance.
  - **Interest:** Distorts success based on whether the company is debt-financed
    or equity-financed.
  - **Depreciation & Amortization:** Depreciation (for tangible assets like
    warehouses/factories) and amortization (for intangible assets like patents)
    are non-cash expenses that can artificially suppress the earnings of rapidly
    growing companies (e.g., Amazon or Tesla) that invest heavily in
    infrastructure.
- **EV/EBITDA Multiples:** EBITDA is commonly compared to Enterprise Value to
  create valuation multiples:
  - **Tesla:** 36x EV/EBITDA
  - **Ford:** 15x EV/EBITDA
  - **GM:** 6x EV/EBITDA

### 6. Present Value of a Growing Perpetuity

The **Growing Perpetuity Formula** connects valuation multiples (like EV/EBITDA)
back to fundamental financial drivers (cost of capital and growth rate). A
growing perpetuity is a stream of cash flows that grows at a constant rate
forever.

- **Formula:**
  $$\text{Value of a Growing Perpetuity} = \frac{\text{Cash Flow}}{\text{Cost of Capital} - \text{Growth Rate}}$$
- **Interconnecting EBITDA and EV:** If we treat a company's EBITDA as the
  recurring cash flow ($CF$) and its Enterprise Value ($EV$) as the present
  value of that growing perpetuity, we get:
  $$\text{Enterprise Value} = \frac{\text{EBITDA}}{\text{Cost of Capital} - \text{Growth Rate}}$$
  Rearranging this reveals that the EV/EBITDA multiple (ratio) is the inverse of
  the denominator:
  $$\frac{\text{Enterprise Value}}{\text{EBITDA}} = \frac{1}{\text{Cost of Capital} - \text{Growth Rate}}$$
- **Explaining Multiple Discrepancies:** Using the EV/EBITDA ratios of the car
  manufacturers:
  - **Tesla (36x):** Denominator ($\text{Cost of Capital} - \text{Growth Rate}$)
    $= 1/36 = 2.8\%$. If Tesla's cost of capital is $20\%$, the market implies
    an expected future growth rate of $17.2\%$. The market is willing to pay a
    premium because it believes Tesla's future growth rate is very close to its
    cost of capital.
  - **Ford (15x):** Denominator $= 1/15 = 6.7\%$.
  - **GM (6x):** Denominator $= 1/6 = 16.7\%$.

This demonstrates the power of growth in valuation. Even if a company has lower
revenue today, expected high growth rates reduce the denominator in the
perpetuity formula, dramatically increasing the valuation multiple and overall
Enterprise Value.
