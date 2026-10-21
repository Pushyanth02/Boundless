"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_MODEL } from "@/lib/openrouter";

interface BoundlessSettings {
  /** OpenRouter API key — lives in localStorage only, sent per-request. */
  openRouterKey: string;
  model: string;
  aiMode: boolean;
  setKey: (key: string) => void;
  setModel: (model: string) => void;
  setAiMode: (on: boolean) => void;
}

export const useBoundless = create<BoundlessSettings>()(
  persist(
    (set) => ({
      openRouterKey: "",
      model: DEFAULT_MODEL,
      aiMode: false,
      setKey: (openRouterKey) => set({ openRouterKey }),
      setModel: (model) => set({ model }),
      setAiMode: (aiMode) => set({ aiMode }),
    }),
    { name: "boundless-settings" }
  )
);

export const SAMPLE_JD = `We are seeking a Senior Full Stack Developer to join our Product Engineering team.

Responsibilities:
- Build and ship user-facing features with React and TypeScript across our Next.js application
- Design REST and GraphQL APIs in Node.js
- Own end-to-end delivery of product experiments, from spec to production
- Improve performance and accessibility of our web platform
- Mentor junior engineers and drive a healthy code review culture

Requirements:
- 5+ years of professional software engineering experience
- Expert-level JavaScript/TypeScript and modern React
- Strong Node.js and REST API design experience
- Experience with SQL databases (PostgreSQL preferred)
- Comfortable with Git-based workflows and CI/CD pipelines
- Bachelor's degree in Computer Science or equivalent practical experience

Nice to have:
- Experience with GraphQL, Docker, Kubernetes, and cloud platforms (AWS/GCP)
- Familiarity with testing frameworks like Jest or Cypress
- Experience with microservices and system design at scale`;

export const SAMPLE_RESUME = `JORDAN A. RIVERA
San Francisco, CA | (415) 555-0192 | jordan.rivera.dev@gmail.com
linkedin.com/in/jordanrivera | github.com/jrivera

SUMMARY
Full stack developer with 6+ years building product features end-to-end. Shipped React and TypeScript applications used by 200k+ monthly users, and designed Node.js services handling 12M requests per day.

EXPERIENCE

Senior Software Engineer — Northwind Labs | Jan 2022 – Present
- Led development of a Next.js customer dashboard that increased activation by 23%
- Designed REST APIs in Node.js serving 12M requests/day at p99 under 180ms
- Introduced TypeScript across the frontend, cutting runtime errors by 41%
- Mentored 4 junior engineers through structured code review and pairing

Software Engineer — Bright Harbor | Jun 2019 – Dec 2021
- Built React components for a design system adopted by 6 product teams
- Improved PostgreSQL query performance, reducing page loads by 35%
- Automated CI/CD pipelines with GitHub Actions, deploying 3x more frequently
- Wrote Jest and Cypress tests, raising coverage from 48% to 86%

SKILLS
JavaScript, TypeScript, React, Next.js, Node.js, REST APIs, GraphQL, PostgreSQL, Redis, Git, GitHub Actions, CI/CD, Jest, Cypress, Testing, Accessibility, Performance optimization, System design

PROJECTS
OpenChord — open-source chord library for guitar learners; 1.2k GitHub stars
Cartographer — offline-first maps PWA with service workers and IndexedDB

EDUCATION
B.S. Computer Science, University of California, Davis | 2015 – 2019`;
