import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { evaluateTaskCompletion } from '@/lib/ai';

const evaluateTaskSchema = z.object({
  taskTitle: z.string(),
  taskDescription: z.string(),
  userSubmission: z.string().min(10, 'Submission must be at least 10 characters'),
  baseXP: z.number().min(0),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate input
    const validatedData = evaluateTaskSchema.parse(body);

    // Evaluate task completion using AI
    const evaluation = await evaluateTaskCompletion(
      validatedData.taskTitle,
      validatedData.taskDescription,
      validatedData.userSubmission,
      validatedData.baseXP
    );

    return NextResponse.json({
      success: true,
      data: evaluation,
    });
  } catch (error) {
    console.error('Error in evaluate-task API:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid input',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to evaluate task',
      },
      { status: 500 }
    );
  }
}
