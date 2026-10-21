@extends('layouts.app')
@section('content')
<div class="page-title"><div><h1>Shop Categories</h1></div></div>
<section class="card"><table><thead><tr><th>Business type</th><th>Shops</th></tr></thead>
<tbody>@foreach($types as $type)<tr><td>{{ str_replace('_',' ', $type->business_type) }}</td><td>{{ $type->total }}</td></tr>@endforeach</tbody></table></section>
@endsection
