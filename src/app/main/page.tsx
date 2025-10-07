import { redirect } from 'next/navigation';

export default function HomePage() {
  // Redirect the user from the root URL to the 'My Moments' page
  redirect('/moments');
}