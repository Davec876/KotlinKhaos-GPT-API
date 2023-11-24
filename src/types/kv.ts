import type PracticeQuiz from '../classes/PracticeQuiz';
import type Quiz from '../classes/Quiz';
import type { FinishedUserAttempt } from '../classes/Quiz';
import type QuizAttempt from '../classes/QuizAttempt';

export interface QuizKv {
	authorId: Quiz['authorId'];
	courseId: Quiz['courseId'];
	savedAuthorsCourseInfo: Quiz['savedAuthorsCourseInfo'];
	prompt: Quiz['prompt'];
	questionLimit: Quiz['questionLimit'];
	name: Quiz['name'];
	startedAttemptsUserIds: string[];
	finishedUserAttempts: { [k: string]: FinishedUserAttempt };
	startedAt: string | undefined;
	finishedAt: string | undefined;
	questions: Quiz['questions'];
}

export interface QuizAttemptKv {
	quizId: QuizAttempt['quizId'];
	courseId: QuizAttempt['courseId'];
	studentId: QuizAttempt['studentId'];
	quizQuestions: QuizAttempt['quizQuestions'];
	score: QuizAttempt['score'];
	userAnswers: QuizAttempt['userAnswers'];
	submittedOn: string | undefined;
}

export interface PracticeQuizKv {
	userId: PracticeQuiz['userId'];
	savedUsersCourseInfo: PracticeQuiz['savedUsersCourseInfo'];
	prompt: PracticeQuiz['prompt'];
	questionLimit: PracticeQuiz['questionLimit'];
	state: PracticeQuiz['state'];
	currentQuestionNumber: PracticeQuiz['currentQuestionNumber'];
	history: PracticeQuiz['history'];
}
