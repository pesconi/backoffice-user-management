import { AuthShell } from '../../components/auth-shell';
import { SignInForm } from './sign-in-form';

export default function SignInPage() {
    return <AuthShell mode="sign-in"><SignInForm /></AuthShell>;
}