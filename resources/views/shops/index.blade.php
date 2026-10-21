@extends('layouts.app')
@section('content')
<div class="page-title"><div><h1>Stores</h1></div><a class="btn primary" href="{{ auth()->user()->isSuperAdmin() ? route('shops.create') : route('stores.create') }}">+ Create</a></div>
<section class="card"><table><thead><tr><th>Name</th><th>Type</th><th>Email</th><th>Status</th></tr></thead>
<tbody>@foreach($stores as $store)<tr><td>{{ $store->name }}</td><td>{{ str_replace('_', ' ', $store->business_type) }}</td><td>{{ $store->email }}</td><td>{{ $store->is_active ? 'Active' : 'Inactive' }}</td></tr>@endforeach</tbody></table>{{ $stores->links() }}</section>
@endsection
