import { BrowserRouter } from 'react-router-dom';
import { useTheme } from './hooks/useTheme';
import { useAuthBootstrap } from './hooks/useAuth';
import { useUnfilteredBootstrap } from './hooks/useUnfilteredBootstrap';
import { AppRoutes } from './routes/AppRoutes';

const ThemeLoader = () => {
  useTheme();
  return null;
};

const AuthLoader = () => {
  useAuthBootstrap();
  return null;
};

const DataBootstrapLoader = () => {
  useUnfilteredBootstrap();
  return null;
};

function App() {
  return (
    <BrowserRouter>
      <ThemeLoader />
      <AuthLoader />
      <DataBootstrapLoader />
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
