import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { Home } from "./pages/Home";
import { CinematicIntro } from "./pages/CinematicIntro";
import { Upload } from "./pages/Upload";
import { AppDetail } from "./pages/AppDetail";
import { WebsiteDetail } from "./pages/WebsiteDetail";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/intro" element={<CinematicIntro />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="upload" element={<Upload />} />
          <Route path="app/:slug" element={<AppDetail />} />
          <Route path="website/:slug" element={<WebsiteDetail />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
