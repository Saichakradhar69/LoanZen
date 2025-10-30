import { Landmark } from "lucide-react";
import Link from "next/link";

interface LogoProps {
  href?: string;
}

export default function Logo({ href = "/" }: LogoProps) {
    return (
        <Link href={href} className="flex items-center gap-2" prefetch={false}>
            <Landmark className="h-6 w-6 text-primary" />
            <span className="font-headline text-lg font-bold">LoanZen</span>
        </Link>
    )
}
