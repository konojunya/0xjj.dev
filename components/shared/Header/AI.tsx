"use client";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import Orb from "@/components/shared/bits/Orb";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";

export const AI: React.FC = () => {
  const form = useForm();

  return (
    <Drawer direction="bottom">
      <DrawerTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Orb
            hoverIntensity={0.5}
            rotateOnHover={true}
            hue={0}
            forceHoverState={false}
          />
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Any questions for JJ?</DrawerTitle>
          <DrawerDescription>
            Tech? Life in Tokyo? Favorite snack while coding? Ask away.
          </DrawerDescription>
        </DrawerHeader>
        <Form {...form}>
          <form className="p-4">
            <FormField
              control={form.control}
              name="prompt"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea {...field} placeholder="Ask JJ anything..." />
                  </FormControl>
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DrawerFooter>
          <div className="flex justify-end gap-2">
            <Button type="submit" disabled>
              Submit
            </Button>
            <DrawerClose>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
