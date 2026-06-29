import { BrowserRouter } from 'react-router-dom';
import { useTheme } from './hooks/useTheme';
import { AppRoutes } from './routes/AppRoutes';

const ThemeLoader = () => {
  useTheme();
  return null;
};

function App() {
  return (
    <BrowserRouter>
      <ThemeLoader />
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
