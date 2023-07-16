import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const headers = new Headers();
headers.append("Content-Type", "application/json");
headers.append("X-ClientId", `${process.env.ESUITE_API_CLIENT}` || "");
headers.append("X-ClientPassword", `${process.env.ESUITE_API_PASSWORD}` || "");
headers.append("X-Version", `${process.env.ESUITE_API_VERSION}` || "");

type ValidationErrors = {
  path: string;
  message: string;
};
type ErrorResponse = {
  errorMessage: string;
  validationErrors?: ValidationErrors[];
};

enum PeriodType {
  Day = "Days",
  Month = "Months",
  Year = "Years",
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
  productReference: string;
  description: string;
  unitPrice: number;
  itemTotal: number;
  schedules: Schedule[];
};

type eSuiteResponse = {
  productReferences: eSuiteProduct[];
};

type eSuiteProduct = {
  productReference: string;
  grossAmount: number;
  netAmount: number;
  taxAmount: number;
  description: string;
};
const requestSchema = z.object({
  AccountId: z.number().optional(),
  AccountReference: z.string().optional(),
  ClientUserId: z.string().optional(),
  EmailAddress: z.string().optional(),
  PaymentMethod: z.string().optional(),
  Currency: z.string().optional(),
  ServiceId: z.number().optional(),
  ContractReference: z.string().optional(),
  FrequencyUnit: z.number(),
  FrequencyPeriod: z.nativeEnum(PeriodType),
  cartReference: z.string().optional(),
  ProductReferences: z.array(
    z.object({
      ProductId: z.number().optional(),
      ProductReference: z.string(),
      grossAmount: z.number().optional(),
      netAmount: z.number().optional(),
      taxAmount: z.number().optional(),
      Currency: z.string(),
      CustomProductParameters: z
        .array(
          z.object({
            ParameterReference: z.string(),
            ParameterName: z.string(),
            ParameterValue: z.string(),
          })
        )
        .optional(),
      CustomLineItemParameters: z
        .array(
          z.object({
            ParameterReference: z.string(),
            ParameterName: z.string(),
            ParameterValue: z.string(),
          })
        )
        .optional(),
    })
  ),
  Address: z
    .object({
      HouseName: z.string(),
      HouseNumber: z.string(),
      Street: z.string(),
      TownCity: z.string(),
      State: z.string(),
      County: z.string(),
      PostCode: z.string(),
      Country: z.string(),
      IsDefault: z.boolean(),
      DefaultInvoice: z.boolean(),
      DefaultShipping: z.boolean(),
    })
    .optional(),
  CustomSubscriptionParameters: z
    .array(
      z.object({
        ParameterReference: z.string(),
        ParameterName: z.string(),
        ParameterValue: z.string(),
      })
    )
    .optional(),
});

export async function POST(
  req: Request,
  res: NextResponse<eSuiteResponse | ErrorResponse>
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

    const items = body.ProductReferences.map(
      (product: { ProductReference: any; Currency: any }) => ({
        productReference: product.ProductReference,
        currency: product.Currency,
      })
    );

    // Get all product references for eSuite search.
    const productReferences = items.map(
      (item: { productReference: any }) => item.productReference
    );
    const combinedProductReferences = productReferences.join(
      "&productReferences="
    );

    const queryString = `productReferences=${combinedProductReferences}`;

    // fetch eSuite Product Information for the products in question, this is because the unit price is not provided in the eSuite pricing update webhook.
    const response =
      (await fetch(
        `${process.env.ESUITE_API_HOST}/api/products?${queryString}`,
        {
          headers: headers,
        }
      )) || {};

    let esuiteProducts: any;
    try {
      if (response.status === 204) {
        esuiteProducts = {};
      } else {
        esuiteProducts = await response.json();
      }
    } catch (error) {
      throw new Error(`error calling eSuite API`);
    }

    const updatedItems = items.map(
      (item: { productReference: any; currency: any }) => {
        const matchingProduct = esuiteProducts.find(
          (apiProduct: { productReference: any }) =>
            apiProduct.productReference === item.productReference
        );

        if (typeof matchingProduct === "undefined") {
          throw new Error(
            `eSuite product lookup could not find productReference: ${item.productReference}`
          );
        }

        if (matchingProduct) {
          const pricing = matchingProduct.pricing.find(
            (price: { currency: any }) => price.currency === item.currency
          );
          if (typeof pricing === "undefined") {
            throw new Error(
              `eSuite product lookup could not find currency match for productReference: ${item.productReference}`
            );
          }

          return {
            ...item,
            description: matchingProduct.name,
            unitPrice: pricing.amount,
          };
        }

        return item;
      }
    );

    /// retrieve product schedules
    const promises = updatedItems.map(
      async (item: { [x: string]: any; productReference: any }) => {
        const { productReference, ...rest } = item;
        try {
          const schedules = await fetchSchedules(productReference);
          if (typeof schedules === "undefined") {
            throw new Error(
              `eSuite product schedule lookup returned undefined for productReference: ${productReference}`
            );
          }
          // filter only daily schedules
          const filteredSchedules = schedules.filter(
            (schedule: { scheduleType: string; dailySchedule: any }) => {
              if (schedule.scheduleType === "Daily") {
                if (!schedule.dailySchedule) {
                  throw new Error(
                    'No daily schedule found for the schedule type "Daily"'
                  );
                }
                return schedule;
              }
            }
          );
          // if no daily schedule, return error
          if (filteredSchedules.length == 0) {
            throw new Error(
              `eSuite product schedule lookup returned no daily schedule for productReference: ${productReference}`
            );
          }

          // format schedule
          const formattedSchedule = {
            monday: filteredSchedules[0].dailySchedule.monday,
            tuesday: filteredSchedules[0].dailySchedule.tuesday,
            wednesday: filteredSchedules[0].dailySchedule.wednesday,
            thursday: filteredSchedules[0].dailySchedule.thursday,
            friday: filteredSchedules[0].dailySchedule.friday,
            saturday: filteredSchedules[0].dailySchedule.saturday,
            sunday: filteredSchedules[0].dailySchedule.sunday,
          };
          return { productReference, ...rest, schedule: formattedSchedule };
        } catch (err: unknown) {
          if (err instanceof Error) {
            throw new Error(err.message);
          }
          throw new Error(`eSuite product schedule lookup returned an error`);
        }
      }
    );

    const itemsWithSchedules = await Promise.all(promises);

    // now we have all information from eSuite that is needed.
    const periodStartDate: string = new Date().toISOString();
    const excludeCurrentDay: boolean = true;

    //  calculate period end date
    const periodEndDate: string = addPeriod(
      periodStartDate,
      body.FrequencyUnit,
      body.FrequencyPeriod
    );

    const itemsUpdate: Item[] = itemsWithSchedules.map((item: Item) =>
      mapProductSchedules(
        item,
        periodStartDate,
        periodEndDate,
        excludeCurrentDay
      )
    );
    const workingTotal: number = itemsUpdate
      .map((item: Item) =>
        item.schedules.reduce(
          (total: number, schedule: { schedulePrice: number }) =>
            total + schedule.schedulePrice,
          0
        )
      )
      .reduce((total: number, price: number) => total + price, 0);

    const totalPrice: number = +workingTotal.toFixed(2);

    // remap to eSuite response spec
    const eSuiteRes = itemsUpdate.map((item: Item) => {
      const { productReference, itemTotal, description } = item;
      return {
        productReference,
        grossAmount: itemTotal,
        netAmount: itemTotal,
        taxAmount: 0.0,
        description,
      };
    });

    const res: eSuiteResponse = {
      productReferences: eSuiteRes,
    };

    return NextResponse.json(res, {
      status: 200,
    });
  } catch (err: unknown) {
    if (err instanceof Error) {
      return NextResponse.json(
        {
          errorMessage: err.message,
        },
        {
          status: 500,
        }
      );
    }
  }
}

async function fetchSchedules(productReference: string): Promise<any> {
  const response =
    (await fetch(
      `${process.env.ESUITE_API_HOST}/api/products/${productReference}/schedules`,
      {
        headers: headers,
      }
    )) || {};
  let data;
  try {
    if (response.status === 204) {
      data = undefined;
    } else {
      data = await response.json();
    }
  } catch (error) {
    throw new Error(`error calling eSuite API`);
  }
  return data;
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
  const { productReference, description, unitPrice, schedule } = items;
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
  return { productReference, description, unitPrice, itemTotal, schedules };
}

function calculateSchedulePrice(unitPrice: number, issues: number): number {
  const totalPrice: number = unitPrice * issues;
  return +totalPrice.toFixed(2);
}
