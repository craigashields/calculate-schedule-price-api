<div align="center">

  <h1>Calculate Schedule Pricing API</h1>
  
  <p>
    This API is primarily aimed at publishers to demonstrate how to calculate a user's subscription cost based on a unit price and the number of issues published between 2 dates (Subscription Start and Subscription Expiry).
  </p>

<!-- Badges -->
<p>
<a href="https://github.com/craigashields/calculate-schedule-price-api/graphs/contributors">
    <img src="https://img.shields.io/github/contributors/craigashields/calculate-schedule-price-api" alt="contributors" />
</a>
<a href="">
    <img src="https://img.shields.io/github/last-commit/craigashields/calculate-schedule-price-api" alt="last update" />
</a>
<a href="https://github.com/craigashields/calculate-schedule-price-api/network/members">
    <img src="https://img.shields.io/github/forks/craigashields/calculate-schedule-price-api" alt="forks" />
</a>
<a href="https://github.com/craigashields/calculate-schedule-price-api/stargazers">
    <img src="https://img.shields.io/github/stars/craigashields/calculate-schedule-price-api" alt="stars" />
</a>
<a href="https://github.com/craigashields/calculate-schedule-price-api/issues/">
    <img src="https://img.shields.io/github/issues/craigashields/calculate-schedule-price-api" alt="open issues" />
</a>
</p>  
<h4>
    <a href="https://github.com/craigashields/calculate-schedule-price-api/">View Demo</a>
  <span> · </span>
    <a href="https://github.com/craigashields/calculate-schedule-price-api">Documentation</a>
  <span> · </span>
    <a href="https://craigashields.github.io/api-documentation/calculate-schedule-pricing.html">API Docs</a>
  <span> · </span>
    <a href="https://github.com/craigashields/calculate-schedule-price-api/issues/">Report Bug</a>
  <span> · </span>
    <a href="https://github.com/craigashields/calculate-schedule-price-api/issues/">Request Feature</a>
  </h4>
</div>

## Table of Contents

- [Disclaimer](#disclaimer)
- [Pre-Requisites](#prerequisites)
- [Description](#description)
- [Enhancements](#enhancements)
- [Installation](#installation)
- [Usage](#usage)
- [Tech Stack](#tech-stack)

## Disclaimer

Please note that this repo is purely for example purposes and therefore may not cater for all use cases and error handling. This should not be used in a production environment.

## Pre-Requisites

You will need the following if you are to use this code locally and would like to test the eSuite specific API.

- eSuite environment
- eSuite API Key

Please contact your Account Manager / Customer Support Representive or Onboarding Team if you are unsure on the above.

## Description

This API is primarily aimed at publishers to demonstrate how to calculate a user's subscription cost based on a unit price and the number of issues published between 2 dates (Subscription Start and Subscription Expiry).

If you wish to test this API without local setup, see the API documentation for details.

## Enhancements

- Refactor API code to:
  - have shared functions
  - improve performance
  - improve Zod typings
- Add simple tax calculation
- Firm up Typescript typings and use Zod to infer types where possible.
- Improve Error Handling.

## Installation

To install and set up the project, follow these steps:

1. Clone the repository:

   ```
   git clone [repository url]
   ```

2. Navigate to the project directory: cd [project directory]
3. Install dependencies:

   ```
   npm install
   ```

## Usage

Once the project is installed and set up, you can use it as follows:

1. Create `.env.local` in project directory.
2. Add the following to the environment file

   ```
    ESUITE_API_CLIENT=
    ESUITE_API_HOST=
    ESUITE_API_PASSWORD=
    ESUITE_API_VERSION=
   ```

3. This repo contains rate limiting for the use of the demo server. However, if you are using this locally and do not wish to use the rate limiting, delete the `middleware.ts` file that handles the rate limiting. If you want to use rate limiting, follow below

   - Create an Upstash account (it's free!) [here](https://upstash.com/)
   - Create new database (call it whatever you want)
   - Once connected, you'll see the option **Connect to your database**. Select `@upstash/redis`
   - Here you will find options to copy the `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
   - Copy these files and create entries in your `.env.local` file

   ```
    UPSTASH_REDIS_REST_URL=
    UPSTASH_REDIS_REST_TOKEN=
   ```

   - That's all you need to do, you should now be able to use the rate limit function.

4. Once you are all setup run:

   ```
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000/) in your browser to see the results.

   Call the API at routes

   - http://localhost:3000/api/v1/calculate-schedule-price
   - http://localhost:3000/api/v1/esuite-calc-schedule-price

   See the API documentation for example requests.

## Tech Stack

- [Aptitude eSuite](https://www.aptitudesoftware.com/)
- [Tailwind CSS](https://tailwindcss.com)
- [Next.js](https://nextjs.org)
- [Vercel](https://vercel.com)
- [Zod](https://github.com/colinhacks/zod)
- [Upstash](https://upstash.com/)
