import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Home from "./pages/Home.jsx";
import Generate from "./pages/Generate.jsx";
import Validate from "./pages/Validate.jsx";
import Diy from "./pages/Diy.jsx";
import Library from "./pages/Library.jsx";
import Solar from "./pages/Solar.jsx";
import Studio from "./pages/Studio.jsx";
import Device from "./pages/Device.jsx";
import Shop from "./pages/Shop.jsx";
import About from "./pages/About.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/generate" element={<Generate />} />
        <Route path="/validate" element={<Validate />} />
        <Route path="/diy" element={<Diy />} />
        <Route path="/library" element={<Library />} />
        <Route path="/solar" element={<Solar />} />
        <Route path="/studio" element={<Studio />} />
        <Route path="/device" element={<Device />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/about" element={<About />} />
      </Route>
    </Routes>
  );
}
