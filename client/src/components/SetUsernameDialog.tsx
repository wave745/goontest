import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { User, Check } from 'lucide-react';
import { anonymousUsernameSchema } from '@shared/schema';
import { useUsername } from '@/hooks/useUsername';
import { toast } from '@/hooks/use-toast';

interface SetUsernameDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

const formSchema = z.object({
  username: anonymousUsernameSchema,
});

type FormData = z.infer<typeof formSchema>;

export default function SetUsernameDialog({ 
  open, 
  onOpenChange, 
  trigger 
}: SetUsernameDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { setAnonymousUsername, anonUsername } = useUsername();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: anonUsername || '',
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      setAnonymousUsername(data.username);
      
      toast({
        title: "Username updated!",
        description: `Your username has been set to "${data.username}"`,
      });

      // Close dialog
      if (onOpenChange) {
        onOpenChange(false);
      } else {
        setIsOpen(false);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update username. Please try again.",
        variant: "destructive",
      });
    }
  };

  const controlled = open !== undefined && onOpenChange !== undefined;

  return (
    <Dialog 
      open={controlled ? open : isOpen} 
      onOpenChange={controlled ? onOpenChange : setIsOpen}
    >
      {trigger && (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      )}
      
      <DialogContent className="sm:max-w-[425px]" data-testid="dialog-set-username">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Set Your Username
          </DialogTitle>
          <DialogDescription>
            Choose a unique username for anonymous posting. This will be stored locally and never sent to our servers.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter your username"
                      data-testid="input-username"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    3-20 characters, letters, numbers, and underscores allowed. Must start with a letter. 
                    No consecutive underscores allowed.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (controlled) {
                    onOpenChange?.(false);
                  } else {
                    setIsOpen(false);
                  }
                }}
                data-testid="button-cancel-username"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                data-testid="button-save-username"
              >
                {form.formState.isSubmitting ? (
                  "Saving..."
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Save Username
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}