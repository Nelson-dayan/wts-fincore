import { model, models } from "mongoose";
import { counterSchema, sequenceReservationSchema } from "@/lib/db/schemas/counter.schema";

export const CounterModel = models.Counter ?? model("Counter", counterSchema);

export const SequenceReservationModel =
  models.SequenceReservation ?? model("SequenceReservation", sequenceReservationSchema);
