import { AuthShell } from '../../components/auth-shell';
import { SignUpForm } from './sign-up-form';

export default function SignUpPage() {
    return <AuthShell mode="sign-up"><SignUpForm /></AuthShell>;
}