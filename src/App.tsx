import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import SkinDetailPage from "./pages/SkinDetailPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/skin/:id" element={<SkinDetailPage />} />
      </Route>
    </Routes>
  );
}
