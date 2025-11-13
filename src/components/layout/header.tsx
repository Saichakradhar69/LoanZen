
'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Button, buttonVariants } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Bell, ChevronDown, Cog, LogOut, Menu } from 'lucide-react';
import Logo from '../logo';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { getAuth, signOut } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import ClientOnly from '../ClientOnly';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { cn } from '@/lib/utils';
import { ThemeToggle } from './theme-toggle';
import { useDoc } from '@/firebase/firestore/use-doc';
import { getTrialDaysLeft, type UserDoc } from '@/lib/user-access';
import SettingsDialog from './SettingsDialog';
import NotificationsPopover from './NotificationsPopover';
import { useCurrency, type Currency } from '@/contexts/currency-context';

export default function Header() {
  const [isMounted, setIsMounted] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = getAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { currency, setCurrency } = useCurrency();

  useEffect(() => {
    setIsMounted(true);
  }, []);


  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Wait a moment for auth state to update and cookie to clear
      await new Promise(resolve => setTimeout(resolve, 100));
      // Use router.push instead of window.location to avoid breaking React context
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
      // Fallback to full page reload if router fails
      window.location.href = '/';
    }
  };
  
  const getUserInitials = () => {
    if (!user || !user.displayName) return '?';
    const names = user.displayName.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return names[0][0].toUpperCase();
  }

  // Navigation links change based on auth state
  const loggedOutLinks = [
    { href: '/', label: 'Home' },
    { href: '/#how-it-works', label: 'How It Works' },
    { href: '/#pricing', label: 'Pricing' },
  ];

  const loggedInLinks = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/advisor', label: 'AI Advisor' },
  ];

  const navLinks = user ? loggedInLinks : loggedOutLinks;

  const currencies: Currency[] = ['USD', 'EUR', 'GBP', 'INR'];

  // Subscribe to the authenticated user's profile to determine trial status
  const userDocRef = useMemoFirebase(() => (
    user ? doc(firestore, 'users', user.uid) : null
  ), [user, firestore]);

  const { data: userProfile } = useDoc<UserDoc>(userDocRef);

  const trialDaysLeft = useMemo(() => {
    if (!user || !userProfile) return 0;
    return getTrialDaysLeft(userProfile);
  }, [user, userProfile]);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="mr-auto hidden md:flex items-center gap-4">
          <Logo href={user ? '/dashboard' : '/'} />
          {user && trialDaysLeft > 0 && (
            <div className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), "cursor-default hover:bg-transparent")}> 
              Trial: {trialDaysLeft} {trialDaysLeft === 1 ? 'day' : 'days'} left
            </div>
          )}
        </div>

        <div className="md:hidden flex-1">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <nav className="grid gap-6 text-lg font-medium mt-6">
                <Logo href={user ? '/dashboard' : '/'} />
                {navLinks.map((link) => {
                  const isActive = pathname === link.href || 
                    (link.href === '/dashboard' && pathname?.startsWith('/dashboard')) || 
                    (link.href === '/advisor' && pathname?.startsWith('/advisor'));
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "transition-colors hover:text-foreground",
                        isActive ? "text-foreground font-semibold" : "text-muted-foreground"
                      )}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
        
        <div className="md:hidden">
          <Logo href={user ? '/dashboard' : '/'} />
        </div>

        <nav className="hidden md:flex flex-1 items-center justify-center gap-6 text-sm font-medium">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || 
              (link.href === '/dashboard' && pathname?.startsWith('/dashboard')) || 
              (link.href === '/advisor' && pathname?.startsWith('/advisor'));
            return (
              <Link key={link.href} href={link.href} className={cn(
                "transition-colors hover:text-foreground/80",
                isActive ? "text-foreground font-semibold" : "text-foreground/60"
              )}>
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 ml-auto">
          <ThemeToggle />
          <ClientOnly fallback={
            <>
              <Button size="sm" variant="ghost" asChild>
                <Link href="/login">Login</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/signup">Sign Up</Link>
              </Button>
            </>
          }>
            {!isUserLoading && (
              <>
                {user ? (
                  <>
                  <NotificationsPopover />
                  <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)}>
                    <Cog className="h-5 w-5"/>
                  </Button>
                  <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
                   <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                       <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={user.photoURL || ''} alt={user.displayName || ''} />
                            <AvatarFallback>{getUserInitials()}</AvatarFallback>
                          </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">{user.displayName}</p>
                          <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  </>
                ) : (
                  <>
                    <Button size="sm" variant="ghost" asChild>
                      <Link href="/login">Login</Link>
                    </Button>
                    <Button size="sm" asChild>
                      <Link href="/signup">Sign Up</Link>
                    </Button>
                  </>
                )}
              </>
            )}
          </ClientOnly>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {currency}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {currencies.map(c => (
                <DropdownMenuItem key={c} onSelect={() => setCurrency(c as Currency)}>
                  {c}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
