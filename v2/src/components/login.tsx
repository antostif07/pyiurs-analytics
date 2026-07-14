import { useRouter } from "@tanstack/react-router";
import { useMutation } from "../hooks/useMutation";
import { loginFn } from "../routes/_authed";
import { Auth } from "./auth";

export function Login() {
	const router = useRouter();

	const loginMutation = useMutation({
		fn: loginFn,
		onSuccess: async (ctx) => {
			if (!ctx.data?.error) {
				await router.invalidate();
				router.navigate({ to: "/" });
				return;
			}
		},
	});

	return (
		<Auth
			actionText="Login"
			status={loginMutation.status}
			onSubmit={(e) => {
				const formData = new FormData(e.target as HTMLFormElement);

				loginMutation.mutate({
					data: {
						email: formData.get("email") as string,
						password: formData.get("password") as string,
					},
				});
			}}
			afterSubmit={
				loginMutation.data ? (
					<>
						<div className="font-medium text-destructive-foreground">
							{loginMutation.data.message}
						</div>
						{loginMutation.data.error &&
						loginMutation.data.message === "Invalid login credentials" ? (
							<div>
								<button
									className="text-primary hover:underline font-semibold text-xs mt-1 block text-left bg-transparent border-0 cursor-pointer"
									onClick={(e) => {
										const form = (e.target as HTMLButtonElement).form;
										if (!form) return;
										
									}}
									type="button"
								>
									Sign up instead?
								</button>
							</div>
						) : null}
					</>
				) : null
			}
		/>
	);
}
