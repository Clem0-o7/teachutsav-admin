import { IconTrendingDown, IconTrendingUp, IconUsers, IconCreditCard, IconUserCheck, IconClock } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function SectionCards({ stats = {} }) {
  const {
    totalRegistrations = 0,
    totalPayments = 0,
    verifiedRegistrations = 0,
    pendingVerifications = 0,
  } = stats;

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {/* Total Registrations */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Registrations</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {totalRegistrations.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconUsers className="size-3" />
              All Users
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            <IconUsers className="size-4" /> Total sign-ups
          </div>
          <div className="text-muted-foreground">Everyone who created an account</div>
        </CardFooter>
      </Card>

      {/* Total Payments Submitted */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Payments</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {totalPayments.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconCreditCard className="size-3" />
              Submitted
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            <IconCreditCard className="size-4" /> Pass payments received
          </div>
          <div className="text-muted-foreground">Users who submitted a pass payment</div>
        </CardFooter>
      </Card>

      {/* Verified Registrations */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Verified Registrations</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {verifiedRegistrations.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconUserCheck className="size-3" />
              Verified
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            <IconUserCheck className="size-4 text-green-500" /> Payments confirmed
          </div>
          <div className="text-muted-foreground">Users with at least one verified pass</div>
        </CardFooter>
      </Card>

      {/* Pending Verifications */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Pending Verifications</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {pendingVerifications.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconClock className="size-3" />
              Awaiting
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            <IconClock className="size-4 text-yellow-500" /> Needs review
          </div>
          <div className="text-muted-foreground">Payments waiting for verification</div>
        </CardFooter>
      </Card>
    </div>
  );
}
