import { redirect } from 'next/navigation';

// Short, memorable entrypoint (e.g. theo.newconcierge.app/m)
// Redirects to the resident page; user may be asked to login if not authenticated.
export default function ShortMyApartmentRedirect() {
  redirect('/my-apartment');
}


