<?php

namespace App\Support;

use InvalidArgumentException;

class Code128
{
    /** @var list<string> */
    private const PATTERNS = [
        '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
        '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
        '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
        '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
        '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
        '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
        '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
        '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
        '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
        '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
        '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
    ];

    /**
     * @return list<int>
     */
    public static function codes(string $text): array
    {
        if ($text === '' || ! preg_match('/^[\x20-\x7E]+$/', $text)) {
            throw new InvalidArgumentException('Code 128 can only encode printable ASCII.');
        }

        $codes = [104];
        $sum = 104;
        $weight = 1;
        $length = strlen($text);
        for ($index = 0; $index < $length; $index++) {
            $value = ord($text[$index]) - 32;
            $codes[] = $value;
            $sum += $value * $weight;
            $weight++;
        }
        $codes[] = $sum % 103;
        $codes[] = 106;

        return $codes;
    }

    public static function svg(string $text, int $module = 2, int $height = 56): string
    {
        $codes = self::codes($text);
        $quiet = 10;
        $modules = $quiet;
        foreach ($codes as $code) {
            $modules += array_sum(array_map('intval', str_split(self::PATTERNS[$code])));
        }
        $modules += $quiet;
        $width = $modules * $module;
        $x = $quiet * $module;
        $rects = '';
        foreach ($codes as $code) {
            $bar = true;
            foreach (str_split(self::PATTERNS[$code]) as $run) {
                $runWidth = (int) $run * $module;
                if ($bar) {
                    $rects .= '<rect x="'.$x.'" y="0" width="'.$runWidth.'" height="'.$height.'" fill="#111827"/>';
                }
                $x += $runWidth;
                $bar = ! $bar;
            }
        }

        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '.$width.' '.$height.'" width="'.$width.'" height="'.$height.'" role="img" aria-label="'.htmlspecialchars($text, ENT_QUOTES).'">'.$rects.'</svg>';
    }
}
