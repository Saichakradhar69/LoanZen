import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
    return (
        <div className="container mx-auto p-4 sm:p-6 md:p-8">
            <Card>
                <CardHeader>
                    <CardTitle>Welcome to your Dashboard!</CardTitle>
                    <CardDescription>You have successfully logged in.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>This is a protected page. Only authenticated users can see this.</p>
                </CardContent>
            </Card>
        </div>
    )
}
