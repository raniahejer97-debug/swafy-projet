import { Routes, Route, Navigate } from "react-router-dom"; 

import Login from "./pages/Login";
import Register from "./pages/Register";
import LiveViewer from "./pages/LiveViewer";
import ParametreContact from "./pages/ParametreContact";

import JeuneLayout from "./pages/JeuneLayout";
import JeuneDashboard from "./pages/JeuneDashborad";
import Notifications from "./pages/Notifications";
import MessangerPage from "./pages/MessangerPage";
import ProtectedRoute from "./components/ProtectedRoute";
import JeuneEnquete from "./pages/jeuneEnquete";
import AdminEnquete from "./pages/AdminEnquete";
import JeuneEnquetesList from "./pages/JeuneEnquetesList";

import AdminDashboard from "./pages/AdminDashboard";
import AdminLiveStream from "./pages/AdminLiveStream";
import AdminContact from "./pages/AdminContact";
import ArchivePage from "./pages/ArchivePage";
import NewLive from "./pages/NewLive";
import CalendarPage from "./pages/CalendarPage";
import Swafy_Meet from "./pages/Swafy_Meet";
import MeetRoom from "./pages/MeetRoom";

export default function App() {
  return (
    
      <Routes>

        {/* ✅ START LOGIN مباشرة */}
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />

        <Route path="/register" element={<Register />} />
        <Route path="/live/:roomCode" element={<LiveViewer />} />
        <Route path="/parametre-contact" element={<ParametreContact />} />
        
        <Route
          path="/admin/enquetes"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminEnquete />
            </ProtectedRoute>
          }
        />

        <Route
          path="/jeune/messenger"
          element={<Navigate to="/jeune/messages" replace />}
        />
         
        <Route
          path="/jeune"
          element={
            <ProtectedRoute requiredRole="jeune">
              <JeuneLayout />
            </ProtectedRoute>
          }
        >
          <Route path="enquetes" element={<JeuneEnquetesList />} />
          <Route path="enquete/:id" element={<JeuneEnquete />} />
          <Route index element={<JeuneDashboard />} />
          <Route path="notifications" element={<Notifications />} />
        </Route>

        <Route
          path="/jeune/messages"
          element={
            <ProtectedRoute requiredRole="jeune">
              <MessangerPage />
            </ProtectedRoute>
          }
        />

        {/* ADMIN */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/contact"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminContact />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/live"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminLiveStream />
            </ProtectedRoute>
          }
        />

        <Route
          path="/archive"
          element={
            <ProtectedRoute requiredRole="admin">
              <ArchivePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/new-live"
          element={
            <ProtectedRoute requiredRole="admin">
              <NewLive />
            </ProtectedRoute>
          }
        />

        {/* CALENDAR / MEET */}
        <Route
          path="/calendar"
          element={
            <ProtectedRoute>
              <CalendarPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/meet"
          element={
            <ProtectedRoute>
              <Swafy_Meet />
            </ProtectedRoute>
          }
        />

        <Route
          path="/meet/:roomCode"
          element={
            <ProtectedRoute>
              <MeetRoom />
            </ProtectedRoute>
          }
        />

      </Routes>
    
  );
}