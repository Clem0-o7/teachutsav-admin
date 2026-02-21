"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const chartConfig = {
  registrations: {
    label: "Registrations",
    color: "var(--primary)",
  },
  payments: {
    label: "Payments",
    color: "var(--chart-2, hsl(217 91% 60%))",
  },
}

export function ChartAreaInteractive({ chartData = [] }) {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState("30d")

  React.useEffect(() => {
    if (isMobile) setTimeRange("7d")
  }, [isMobile])

  const filteredData = React.useMemo(() => {
    if (!chartData.length) return []
    const now = new Date()
    let daysToSubtract = 30
    if (timeRange === "90d") daysToSubtract = 90
    else if (timeRange === "7d") daysToSubtract = 7
    const startDate = new Date(now)
    startDate.setDate(startDate.getDate() - daysToSubtract)
    return chartData.filter(item => new Date(item.date) >= startDate)
  }, [chartData, timeRange])

  return (
    <Card className="@container/card">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Registrations &amp; Payments Over Time</CardTitle>
          <CardDescription className="mt-1">
            Daily registrations vs. pass payment submissions
          </CardDescription>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-40" size="sm" aria-label="Time range">
            <SelectValue placeholder="Last 30 days" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="90d" className="rounded-lg">Last 3 months</SelectItem>
            <SelectItem value="30d" className="rounded-lg">Last 30 days</SelectItem>
            <SelectItem value="7d" className="rounded-lg">Last 7 days</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-2 sm:px-6 sm:pt-4">
        {filteredData.length === 0 ? (
          <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
            No data available for this period
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
            <AreaChart data={filteredData} margin={{ left: 0, right: 0 }}>
              <defs>
                <linearGradient id="fillRegistrations" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-registrations)" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="var(--color-registrations)" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="fillPayments" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-payments)" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="var(--color-payments)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={28}
                tickFormatter={(value) =>
                  new Date(value).toLocaleDateString("en-IN", { month: "short", day: "numeric" })
                }
              />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} width={32} />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) =>
                      new Date(value).toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    }
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="registrations"
                type="monotone"
                fill="url(#fillRegistrations)"
                stroke="var(--color-registrations)"
                strokeWidth={2}
              />
              <Area
                dataKey="payments"
                type="monotone"
                fill="url(#fillPayments)"
                stroke="var(--color-payments)"
                strokeWidth={2}
              />
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
