import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { MasterProductList } from "./pages/masterProductList";
import { MasterProductDetails } from "./pages/masterProductDetails";
import { LoginPage } from "./pages/Login";
import { ProtectRoute } from "./components/ProtectRoutes";
import { LotList } from "./pages/LotsList";
import { Approvals } from "./pages/Approvals";
import { Products } from "./pages/Products";
import Users from "./pages/Users";
import { CategoryList } from "./pages/CategoryList";
import { IndustryTypes } from "./pages/IndustryTypes";
// import { ProductDetail } from "./pages/ProductDetail";
import { OrderList } from "./pages/OrderList";
import { Banner } from "./pages/Banner";
import { OrderDetail } from "./pages/OrderDetail";
import Dashboard from "./pages/Dashboard";
import NotificationCenter from "./pages/NotificationCenter";

// Wallet Pages
import { WalletDashboard } from "./pages/WalletDashboard";
import { WalletAccounts } from "./pages/WalletAccounts";
import { WalletDetails } from "./pages/WalletDetails";
import { WalletTransactions } from "./pages/WalletTransactions";
import { WalletWithdrawals } from "./pages/WalletWithdrawals";
import { WalletCommissionRules } from "./pages/WalletCommissionRules";
import { WalletAnalytics } from "./pages/WalletAnalytics";
import { WalletSettings } from "./pages/WalletSettings";
import { PromoterCommissionRelease } from "./pages/PromoterCommissionRelease";
import MyProfile from "./pages/MyProfile";

const App = () => (
  <Router>
    <div className="bg-gray-50 flex flex-col gap-4 min-h-screen">
      <Routes>
        <Route path="/" element={<LoginPage />} />

        <Route
          path="/profile"
          element={
            <ProtectRoute>
              <MyProfile />
            </ProtectRoute>
          }
        />

         <Route
          path="/dashboard"
          element={
            <ProtectRoute>
              <Dashboard />
            </ProtectRoute>
          }
        />

        <Route
          path="/notifications"
          element={
            <ProtectRoute>
              <NotificationCenter />
            </ProtectRoute>
          }
        />

        <Route
          path="/category-list"
          element={
            <ProtectRoute>
              <CategoryList />
            </ProtectRoute>
          }
        />

        <Route
          path="/industry-types"
          element={
            <ProtectRoute>
              <IndustryTypes />
            </ProtectRoute>
          }
        />

        <Route
          path="/users"
          element={
            <ProtectRoute>
              <Users />
            </ProtectRoute>
          }
        />

        <Route
          path="/master-product-list"
          element={
            <ProtectRoute>
              <MasterProductList />
            </ProtectRoute>
          }
        />

        <Route
          path="/master-product/:id"
          element={
            <ProtectRoute>
              <MasterProductDetails />
            </ProtectRoute>
          }
        />

        <Route
          path="/lot-list"
          element={
            <ProtectRoute>
              <LotList />
            </ProtectRoute>
          }
        />

        <Route
          path="/approvals"
          element={
            <ProtectRoute>
              <Approvals />
            </ProtectRoute>
          }
        />

        <Route
          path="/products"
          element={
            <ProtectRoute>
              <Products />
            </ProtectRoute>
          }
        />

        <Route
          path="/orders"
          element={
            <ProtectRoute>
              <OrderList />
            </ProtectRoute>
          }
        />
        <Route
          path="/orders/:id"
          element={
            <ProtectRoute>
              <OrderDetail />
            </ProtectRoute>
          }
        />
        <Route
          path="/banners"
          element={
            <ProtectRoute>
              <Banner />
            </ProtectRoute>
          }
        />

        {/* Wallet Routes */}
        <Route
          path="/wallet/dashboard"
          element={
            <ProtectRoute>
              <WalletDashboard />
            </ProtectRoute>
          }
        />
        <Route
          path="/wallet/accounts"
          element={
            <ProtectRoute>
              <WalletAccounts />
            </ProtectRoute>
          }
        />
        <Route
          path="/wallet/details"
          element={
            <ProtectRoute>
              <WalletDetails />
            </ProtectRoute>
          }
        />
        <Route
          path="/wallet/transactions"
          element={
            <ProtectRoute>
              <WalletTransactions />
            </ProtectRoute>
          }
        />
        <Route
          path="/wallet/withdrawals"
          element={
            <ProtectRoute>
              <WalletWithdrawals />
            </ProtectRoute>
          }
        />
        <Route
          path="/wallet/commission-rules"
          element={
            <ProtectRoute>
              <WalletCommissionRules />
            </ProtectRoute>
          }
        />
        <Route
          path="/wallet/analytics"
          element={
            <ProtectRoute>
              <WalletAnalytics />
            </ProtectRoute>
          }
        />
        <Route
          path="/wallet/settings"
          element={
            <ProtectRoute>
              <WalletSettings />
            </ProtectRoute>
          }
        />
        <Route
          path="/wallet/promoter-commission"
          element={
            <ProtectRoute>
              <PromoterCommissionRelease />
            </ProtectRoute>
          }
        />
        <Route
          path="/promoter-commission"
          element={
            <ProtectRoute>
              <PromoterCommissionRelease />
            </ProtectRoute>
          }
        />
      </Routes>
    </div>
  </Router>
);

export default App;
