import {
	BrowserRouter as Router,
	Routes,
	Route,
	Navigate,
} from 'react-router-dom';
import Login from './Auth/Login';
import Register from './Auth/Register';
import ProtectedRoute from './utils/ProtectedRoute';
import { AuthProvider, useAuth } from './utils/AuthContext';
import ForgotPassword from './Auth/Forgotpassword';

const AuthRedirect = ({ children }) => {
	const { user } = useAuth();
	if (user) return <Navigate to='/' replace />;
	return children;
};

function App() {
	return (
		<AuthProvider>
			<Router>
				<Routes>
					<Route
						path='/'
						element={
							<ProtectedRoute>
							</ProtectedRoute>
						}
					/>
					<Route
						path='/login'
						element={
							<AuthRedirect>
								<Login />
							</AuthRedirect>
						}
					/>
					<Route
						path='/register'
						element={
							<AuthRedirect>
								<Register />
							</AuthRedirect>
						}
					/>
					<Route path='/forgot-password' element={<ForgotPassword />} />
					<Route path='*' element={<Navigate to='/' replace />} />
				</Routes>
			</Router>
		</AuthProvider>
	);
}

export default App;
