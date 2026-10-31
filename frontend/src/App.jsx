import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useParams } from "react-router-dom";
import Layout from "./components/layout/Layout.jsx";
import { RoleProvider, useRole } from "./components/layout/RoleContext.jsx";
import { Loading } from "./components/layout/ui.jsx";
import Career from "./pages/Career.jsx";
import Employees from "./pages/Employees.jsx";
import Forecast from "./pages/Forecast.jsx";
import Gaps from "./pages/Gaps.jsx";
import Learning from "./pages/Learning.jsx";
import Mobility from "./pages/Mobility.jsx";
import Overview from "./pages/Overview.jsx";
import Profile from "./pages/Profile.jsx";
import SkillForecast from "./pages/SkillForecast.jsx";
import Audit from "./pages/governance/Audit.jsx";
import Report from "./pages/governance/Report.jsx";
import Review from "./pages/governance/Review.jsx";
import Risk from "./pages/governance/Risk.jsx";
import Requirements from "./pages/requirements/Requirements.jsx";

const Graph = lazy(() => import("./pages/Graph.jsx"));

function useHomePath() {
  const { role, personaId } = useRole();
  return role === "hr" ? "/overview" : `/profile/${personaId}`;
}

function Home() {
  return <Navigate to={useHomePath()} replace />;
}

function HrOnly() {
  const { role } = useRole();
  const home = useHomePath();
  return role === "hr" ? <Outlet /> : <Navigate to={home} replace />;
}

// An employee only sees their own record. HR can open anyone's.
function OwnRecord({ children }) {
  const { id } = useParams();
  const { pathname } = useLocation();
  const { role, personaId } = useRole();
  if (role === "hr" || id === personaId) return children;
  return <Navigate to={`/${pathname.split("/")[1]}/${personaId}`} replace />;
}

export default function App() {
  return (
    <RoleProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="profile" element={<Home />} />
            <Route path="profile/:id" element={<OwnRecord><Profile /></OwnRecord>} />
            <Route path="learning/:id" element={<OwnRecord><Learning /></OwnRecord>} />
            <Route path="mobility/:id" element={<OwnRecord><Mobility /></OwnRecord>} />
            <Route path="career/:id" element={<OwnRecord><Career /></OwnRecord>} />
            <Route element={<HrOnly />}>
              <Route path="overview" element={<Overview />} />
              <Route path="employees" element={<Employees />} />
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
              <Route path="risk" element={<Risk />} />
              <Route path="review" element={<Review />} />
              <Route path="audit" element={<Audit />} />
              <Route path="report" element={<Report />} />
              <Route path="requirements" element={<Requirements />} />
            </Route>
            <Route path="*" element={<Home />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </RoleProvider>
  );
}
