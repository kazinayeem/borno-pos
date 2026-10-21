<?php

namespace App\Http\Controllers;

use App\Models\ProductSerial;
use App\Models\ProductSerialEvent;
use Illuminate\Http\Request;

class SerialController extends Controller
{
    public function service(Request $request, ProductSerial $serial)
    {
        $data = $request->validate([
            'note' => ['required', 'string', 'max:500'],
        ]);
        if (! in_array($serial->status, ['sold', 'in_stock'], true)) {
            return response()->json(['message' => 'This unit cannot take a service note.'], 422);
        }

        $event = ProductSerialEvent::create([
            'store_id' => $serial->store_id,
            'product_serial_id' => $serial->id,
            'kind' => 'service',
            'note' => $data['note'],
            'happened_on' => now()->toDateString(),
        ]);

        return response()->json([
            'message' => 'Warranty service note saved.',
            'event' => $event,
        ]);
    }
}
