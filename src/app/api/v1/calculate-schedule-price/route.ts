import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

type ValidationErrors = {
  path: string;
  message: string;
};
type ErrorResponse = {
  errorMessage: string;
  validationErrors?: ValidationErrors[];
};

enum PeriodType {
  Day = "day",
  Month = "month",
  Year = "year",
}

enum ScheduleDays {
  Monday = "monday",
  Tuesday = "tuesday",
  Wednesday = "wednesday",
  Thursday = "thursday",
  Friday = "friday",
  Saturday = "saturday",
  Sunday = "sunday",
}

type Schedule = {
  dayOfWeek: string;
  countOfDays: number;
  schedulePrice: number;
};

type Item = {
  itemReference: string;
  unitPrice: number;
  itemTotal: number;
  schedules: Schedule[];
};

type Response = {
  periodStartDate: string;
  periodEndDate: string;
  totalPrice: number;
  items: Item[];
};

const requestSchema = z.object({
  periodStartDate: z.string().datetime({ message: "Invalid datetime string!" }),
  periodLength: z.number(),
  periodType: z.nativeEnum(PeriodType),
  excludeCurrentDay: z.boolean().optional(),
  items: z.array(
    z.object({
      itemReference: z.string(),
      unitPrice: z.number(),
      schedule: z.object({
        monday: z.boolean().optional(),
        tuesday: z.boolean().optional(),
        wednesday: z.boolean().optional(),
        thursday: z.boolean().optional(),
        friday: z.boolean().optional(),
        saturday: z.boolean().optional(),
        sunday: z.boolean().optional(),
      }),
    })
  ),
});

export async function POST(
  req: Request,
  res: NextResponse<Response | ErrorResponse>
) {
  try {
    const body = await req.json();

    // validation based on zod schema
    const validation = requestSchema.safeParse(body);

    if (!validation.success) {
      const validationErrors: z.ZodError = validation.error;

      const err = validationErrors.issues.map((e) => ({
        path: e.path[0],
        message: e.message,
      }));

      return new NextResponse(
        JSON.stringify({
          errorMessage: "validation failure",
          validationErrors: err,
        }),
        {
          status: 400,
          statusText: "Bad Request",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const periodStartDate: string = body.periodStartDate;
    const excludeCurrentDay: boolean = body.excludeCurrentDay;

    //  calculate period end date
    const periodEndDate: string = addPeriod(
      periodStartDate,
      body.periodLength,
      body.periodType
    );

    const items: Item[] = body.items.map((item: Item) =>
      mapProductSchedules(
        item,
        body.periodStartDate,
        periodEndDate,
        excludeCurrentDay
      )
    );

    const workingTotal: number = items
      .map((item: Item) =>
        item.schedules.reduce(
          (total: number, schedule: { schedulePrice: number }) =>
            total + schedule.schedulePrice,
          0
        )
      )
      .reduce((total: number, price: number) => total + price, 0);

    const totalPrice: number = +workingTotal.toFixed(2);

    const res: Response = {
      periodStartDate,
      periodEndDate,
      totalPrice,
      items: items,
    };

    return NextResponse.json(res, {
      status: 200,
    });
  } catch (err) {
    console.log(err);
    return NextResponse.json(
      {
        errorMessage: "Internal Server Error. Please try again later. ",
      },
      {
        status: 500,
      }
    );
  }

  function addPeriod(
    periodStartDate: string,
    periodLength: number,
    periodType: PeriodType
  ): string {
    let startDate = new Date(periodStartDate);

    if (isNaN(startDate.getTime())) {
      throw new Error("Invalid start date.");
    }

    let newDate = new Date(startDate);

    switch (periodType) {
      case PeriodType.Day:
        newDate.setDate(newDate.getDate() + periodLength);
        break;
      case PeriodType.Month:
        newDate.setMonth(newDate.getMonth() + periodLength);
        break;
      case PeriodType.Year:
        newDate.setFullYear(newDate.getFullYear() + periodLength);
        break;
      default:
        throw new Error(
          'Invalid period type. Must be "day", "month", or "year".'
        );
    }

    return newDate.toISOString();
  }
}

function countOccurrencesOfDay(
  periodStartDate: string,
  periodEndDate: string,
  dayOfWeek: ScheduleDays,
  excludeCurrentDay: boolean
): number {
  const startDate = new Date(periodStartDate);
  const endDate = new Date(periodEndDate);

  if (excludeCurrentDay) {
    startDate.setDate(startDate.getDate() + 1);
  }

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error("Invalid start or end date.");
  }

  let count = 0;
  let currentDate = startDate;
  const dayOfWeekIndex = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ].indexOf(dayOfWeek);

  while (currentDate <= endDate) {
    if (currentDate.getDay() === dayOfWeekIndex) {
      count++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return count;
}

function mapProductSchedules(
  items: any,
  periodStartDate: string,
  periodEndDate: string,
  excludeCurrentDay: boolean
): Item {
  const { itemReference, unitPrice, schedule } = items;
  let schedules: Schedule[] = [];
  let total: number = 0.0;

  for (const day in schedule) {
    if (schedule.hasOwnProperty(day) && schedule[day]) {
      const countOfDays: number = countOccurrencesOfDay(
        periodStartDate,
        periodEndDate,
        day as ScheduleDays,
        excludeCurrentDay
      );
      const schedulePrice: number = calculateSchedulePrice(
        unitPrice,
        countOfDays
      );
      schedules.push({
        dayOfWeek: day,
        countOfDays: countOfDays,
        schedulePrice: schedulePrice,
      });
      total += schedulePrice;
    }
  }

  const itemTotal = total > 0 ? +total.toFixed(2) : unitPrice;
  return { itemReference, unitPrice, itemTotal, schedules };
}

function calculateSchedulePrice(unitPrice: number, issues: number): number {
  const totalPrice: number = unitPrice * issues;
  return +totalPrice.toFixed(2);
}
