# GasGuard Swap 🛡️

**Find the most cost-effective routes for your cross-chain cryptocurrency swaps!**

GasGuard Swap leverages the OKX DEX API to analyze available bridges and routes, providing users with a clear breakdown of expected outputs and associated transaction costs (including gas fees and bridge fees). Our goal is to bring transparency and help users maximize their value when moving assets across different blockchains.

<!-- Optional: Add a GIF or Screenshot here of the app in action -->
<!-- ![GasGuard Swap Demo](link_to_your_screenshot_or_gif.png) -->

## ✨ Features

*   **Cross-Chain Route Analysis:** Compares available routes for swapping tokens between supported blockchains.
*   **Cost Transparency:** Provides a detailed breakdown of:
    *   Expected output amount.
    *   Estimated network gas fees (utilizing live gas price data).
    *   Bridge-specific fees.
    *   Total estimated cost.
*   **Best Route Recommendation:** Highlights the route option that offers the best net value (currently based on output minus estimated gas cost in native tokens; USD net value is a planned enhancement).
*   **Multi-Route Display:** If multiple routes are available, GasGuard lists them for comparison.
*   **Minimal & Modern UI:** Clean and user-friendly interface for easy interaction.

## 🛠️ Tech Stack

**Frontend:**
*   React
*   Vite
*   TypeScript
*   Shadcn UI
*   Tailwind CSS

**Backend:**
*   Node.js
*   Express.js
*   OKX DEX API, specifically utilizing:
    *   `/api/v5/dex/aggregator/all-tokens` for token information.
    *   `/api/v5/dex/cross-chain/quote` for route discovery.
    *   `/api/v5/dex/pre-transaction/gas-price` for live gas fee data.

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

*   Node.js (v18.x or later recommended)
*   npm (usually comes with Node.js) or Yarn/pnpm
*   Git

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone [YOUR_GIT_URL_HERE]
    cd GasGuard # Or your main project folder name
    ```

2.  **Setup Backend:**
    *   Navigate to the backend directory:
        ```bash
        cd backend
        ```
    *   Install dependencies:
        ```bash
        npm install
        ```
    *   **Configure Environment Variables:**
        Create a `.env` file in the `backend` directory by copying the example:
        ```bash
        cp .env.example .env 
        ```
        Open the `.env` file and add your OKX API credentials:
        ```env
        OKX_API_KEY="YOUR_OKX_API_KEY"
        OKX_SECRET_KEY="YOUR_OKX_SECRET_KEY"
        OKX_API_PASSPHRASE="YOUR_OKX_API_PASSPHRASE"

        # Optional: You can set default slippage or other config here
        # DEFAULT_SLIPPAGE="0.5" 
        # PORT=3001 # Backend server port
        ```
3.  **Setup Frontend:**
    *   Navigate to the frontend directory (from the project root):
        ```bash
        cd ./frontend # Adjust path if your structure is different
        ```
    *   Install dependencies:
        ```bash
        npm install
        ```
    *   The frontend is configured to proxy API requests to the backend (see `vite.config.ts`).

### Running the Application

You'll need two terminals open to run both the backend and frontend concurrently.

1.  **Start the Backend Server:**
    *   In the `backend` directory:
        ```bash
        npm start
        ```
    *   The backend server will typically start on `http://localhost:3001`.

2.  **Start the Frontend Development Server:**
    *   In the `frontend` directory:
        ```bash
        npm run dev
        ```
    *   The frontend development server will typically start on `http://localhost:8080`.

3.  **Open in Browser:**
    *   Open the URL provided by the Vite development server (e.g., `http://localhost:8080`) in your web browser.

## ⚙️ How to Use

1.  Once the application is running, open it in your browser.
2.  Select the "From" chain and token you wish to swap.
3.  Enter the amount you want to swap.
4.  Select the "To" chain and token you wish to receive.
5.  (Optional) Adjust slippage settings if available.
6.  Click "Find Best Route."
7.  The application will display the recommended route with a detailed cost breakdown. If multiple routes are found by the OKX API, they will also be listed for comparison.

<!-- 
## 📸 Screenshots (Add your screenshots here)

**Input Form:**
![Input Form Screenshot](link_to_input_form_screenshot.png)

**Results Display (Single Route):**
![Single Route Result Screenshot](link_to_single_route_result.png)

**Results Display (Multiple Routes - if you have a demo/mock for this):**
![Multi Route Result Screenshot](link_to_multi_route_result.png)
-->

## 🔮 Future Enhancements

*   **Full USD Value Integration:** Display all monetary values (output, fees, net value) in USD for easier comparison.
*   **Transaction Status Tracking.**
*   **Advanced Sorting/Filtering:** Allow users to sort routes by different metrics (e.g., fastest, cheapest gas, highest output).
*   **Historical Gas Price Data:** Potentially suggest optimal times to swap based on gas price trends.


## 📄 License

This project is licensed under the MIT License - see the `LICENSE.md` file for details (or choose another license if you prefer).

---

Happy Swapping!
