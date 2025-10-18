'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ChevronDown, LogOut, Menu, User } from 'lucide-react';
import Logo from '../logo';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { useState, useEffect } from 'react';
import { useUser } from '@/firebase';
import { getAuth, signOut } from 'firebase/auth';
import ClientOnly from '../ClientOnly';

export default function Header() {
  const [currency, setCurrency] = useState('USD');
  const [isMounted, setIsMounted] = useState(false);
  const { user, isUserLoading } = useUser();
  const auth = getAuth();

  useEffect(() => {
    setIsMounted(true);
  }, []);


  const handleLogout = async () => {
    await signOut(auth);
    // You might want to redirect the user to the homepage after logout
    window.location.href = '/';
  };

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/#how-it-works', label: 'How It Works' },
    { href: '/#pricing', label: 'Pricing' },
  ];

  const currencies = ['USD', 'EUR', 'GBP', 'INR'];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-auto hidden md:flex">
          <Logo />
        </div>

        {/* Mobile Menu */}
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
                <Logo />
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
        
        {/* Centered logo on mobile */}
        <div className="md:hidden">
            <Logo />
        </div>

        {/* Desktop Menu */}
        <nav className="hidden md:flex flex-1 items-center justify-center gap-4 text-sm font-medium">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="text-foreground/60 transition-colors hover:text-foreground/80">
              {link.label}
            </Link>
          ))}
           {user && (
            <Link href="/dashboard" className="text-foreground/60 transition-colors hover:text-foreground/80">
              Dashboard
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2 ml-auto">
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
                   <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="secondary" size="icon" className="rounded-full">
                        <User className="h-5 w-5" />
                        <span className="sr-only">Toggle user menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>My Account</DropdownMenuLabel>
                       <DropdownMenuSeparator />
                      <DropdownMenuItem>
                         <p className="text-sm text-muted-foreground">{user.email}</p>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
                <DropdownMenuItem key={c} onSelect={() => setCurrency(c)}>
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
