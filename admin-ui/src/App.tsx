import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthContext";
import { RequirePlatformAdmin } from "@/auth/RequirePlatformAdmin";
import { AdminLayout } from "@/layout/AdminLayout";
import { DashboardPage } from "@/pages/DashboardPage";
import { InstitutionDetailPage } from "@/pages/InstitutionDetailPage";
import { InstitutionsPage } from "@/pages/InstitutionsPage";
import { LoginPage } from "@/pages/LoginPage";
import { WithdrawalsPage } from "@/pages/WithdrawalsPage";
import { TransactionsPage } from "@/pages/TransactionsPage";
import { WebhookLogsPage } from "@/pages/WebhookLogsPage";
import { WebhookLogDetailPage } from "@/pages/WebhookLogDetailPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename="/admin">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequirePlatformAdmin />}>
            <Route element={<AdminLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="institutions" element={<InstitutionsPage />} />
              <Route
                path="institutions/:id"
                element={<InstitutionDetailPage />}
              />
              <Route path="withdrawals" element={<WithdrawalsPage />} />
              <Route path="transactions" element={<TransactionsPage />} />
              <Route
                path="transactions/:id"
                element={<Navigate to="/transactions" replace />}
              />
              <Route path="webhook-logs" element={<WebhookLogsPage />} />
              <Route
                path="webhook-logs/:id"
                element={<WebhookLogDetailPage />}
              />
              <Route
                path="access-requests"
                element={<Navigate to="../institutions?tab=requests" replace />}
              />
              <Route
                path="earnings-withdrawals"
                element={<Navigate to="../withdrawals" replace />}
              />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
