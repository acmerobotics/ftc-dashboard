import { ThemeProvider } from '@/hooks/useTheme';
import Dashboard from './Dashboard/Dashboard';
import FieldViewTest from './views/FieldView/FieldViewTest';

// TODO: Push store into <Dashboard />.
const App: React.FC = () => {
  if (window.location.pathname === '/dash/fieldtest') {
    return <FieldViewTest />;
  }

  return (
    <ThemeProvider>
      <Dashboard />
    </ThemeProvider>
  );
};

export default App;
