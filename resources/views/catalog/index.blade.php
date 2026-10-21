@extends('layouts.app')
@section('content')
<div class="page-title">
    <div>
        <div class="crumbs">Dashboard › {{ $def['group'] }} › {{ $def['title'] }}</div>
        <h1>{{ $def['title'] }}</h1>
    </div>
    <a class="btn primary" href="{{ route($def['route'].'.create') }}">+ Add</a>
</div>
<section class="card">
    <form method="get" style="margin-bottom:12px"><input name="q" value="{{ request('q') }}" placeholder="Search..." style="max-width:320px;border:1px solid #dbe3ee;border-radius:12px;padding:10px 12px"></form>
    <table>
        <thead>
            <tr>
                <th>SL</th>
                @foreach($def['fields'] as $field)<th>{{ $field['label'] }}</th>@endforeach
                <th>Action</th>
            </tr>
        </thead>
        <tbody>
        @forelse($rows as $row)
            <tr>
                <td>{{ $loop->iteration + ($rows->currentPage()-1)*$rows->perPage() }}</td>
                @foreach($def['fields'] as $field)
                    <td>
                        @php $value = data_get($row, $field['name']); @endphp
                        @if(($field['type'] ?? '') === 'money') @money((int) $value)
                        @elseif(($field['type'] ?? '') === 'checks') {{ implode(', ', $value ?? []) }}
                        @elseif(($field['type'] ?? '') === 'checkbox') {{ $value ? 'Yes' : 'No' }}
                        @elseif(($field['type'] ?? '') === 'select' && isset($def['options'][$field['name']])) {{ $def['options'][$field['name']][$value] ?? $value }}
                        @else {{ $value }}
                        @endif
                    </td>
                @endforeach
                <td>
                    <a href="{{ route($def['route'].'.edit', $row->id) }}">Edit</a>
                    <form method="post" action="{{ route($def['route'].'.destroy', $row->id) }}" data-confirm="Delete this record?" style="display:inline">@csrf @method('DELETE')<button class="btn danger" type="submit">Delete</button></form>
                </td>
            </tr>
        @empty
            <tr><td colspan="{{ count($def['fields'])+2 }}" class="empty">No records yet. Add the first {{ strtolower($def['singular']) }}.</td></tr>
        @endforelse
        </tbody>
    </table>
    <div class="pager">{{ $rows->links() }}</div>
</section>
@endsection
