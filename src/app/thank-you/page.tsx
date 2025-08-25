import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function ThankYouPage() {
  return (
    <div className="container mx-auto max-w-2xl py-12 px-4 flex items-center justify-center min-h-[calc(100vh-14rem)]">
      <Card className="w-full text-center">
        <CardHeader>
          <div className="mx-auto bg-green-100 rounded-full p-3 w-fit">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>
          <CardTitle className="font-headline text-3xl mt-4">Payment Successful!</CardTitle>
          <CardDescription className="text-lg">
            Thank you for your purchase.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Your detailed loan report has been generated and sent to the email address you provided during checkout. Please check your inbox (and spam folder, just in case).
          </p>
          <Button asChild className="mt-8">
            <Link href="/calculator">
                Calculate Another Loan
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
