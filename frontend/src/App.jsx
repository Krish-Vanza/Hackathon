import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout, { DEFAULT_EMPLOYEE } from "./components/layout/Layout.jsx";
import { RoleProvider } from "./components/layout/RoleContext.jsx";
import { Loading } from "./components/layout/ui.jsx";
import Career from "./pages/Career.jsx";
import Forecast from "./pages/Forecast.jsx";
import Gaps from "./pages/Gaps.jsx";
import Learning from "./pages/Learning.jsx";
import Mobility from "./pages/Mobility.jsx";
import Profile from "./pages/Profile.jsx";
import SkillForecast from "./pages/SkillForecast.jsx";
import Audit from "./pages/governance/Audit.jsx";
import Report from "./pages/governance/Report.jsx";
import Review from "./pages/governance/Review.jsx";
import Risk from "./pages/governance/Risk.jsx";
import Requirements from "./pages/requirements/Requirements.jsx";

const Graph = lazy(() => import("./pages/Graph.jsx"));

export default function App() {
  return (
    <RoleProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Navigate to="/forecast" replace />} />
            <Route path="profile" element={<Navigate to={`/profile/${DEFAULT_EMPLOYEE}`} replace />} />
            <Route path="profile/:id" element={<Profile />} />
            <Route path="gaps" element={<Gaps />} />
            <Route
              path="graph"
              element={
                <Suspense fallback={<Loading />}>
                  <Graph />
                </Suspense>
              }
            />
            <Route path="forecast" element={<Forecast />} />
            <Route path="forecast/:skillId" element={<SkillForecast />} />
            <Route path="learning/:id" element={<Learning />} />
            <Route path="mobility/:id" element={<Mobility />} />
            <Route path="career/:id" element={<Career />} />
            <Route path="risk" element={<Risk />} />
            <Route path="review" element={<Review />} />
            <Route path="audit" element={<Audit />} />
            <Route path="report" element={<Report />} />
            <Route path="requirements" element={<Requirements />} />
            <Route path="*" element={<Navigate to="/forecast" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </RoleProvider>
  );
}
