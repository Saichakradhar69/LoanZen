import Link from "next/link";
import Image from "next/image";

interface LogoProps {
  href?: string;
}

export default function Logo({ href = "/" }: LogoProps) {
    return (
        <Link href={href} className="flex items-center gap-2" prefetch={false}>
            <Image 
                src="/logo.png" 
                alt="LoanZen Logo" 
                width={32} 
                height={32}
                className="h-8 w-8"
                priority
            />
            <span className="font-headline text-lg font-bold">LoanZen</span>
        </Link>
    )
}
